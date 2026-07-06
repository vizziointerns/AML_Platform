import ipaddress
import json
import os
import random
import shutil
import socket
import tempfile
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from sqlalchemy import inspect, Table, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import SessionLocal
from app.models.annotation import Annotation
from app.models.training import TrainingRun
from app.training.trainer import (
    TrainingConfig,
    MODELS_DIR,
    _update_run,
    _cancelled_runs,
)


def _resolve_hostname(hostname: str) -> str:
    try:
        addr = ipaddress.ip_address(hostname)
    except ValueError:
        try:
            infos = socket.getaddrinfo(hostname, None)
        except OSError as e:
            raise ValueError(f"Could not resolve hostname: {hostname}") from e
        for _, _, _, _, sockaddr in infos:
            try:
                addr = ipaddress.ip_address(sockaddr[0])
                break
            except ValueError:
                continue
        else:
            raise ValueError(f"Could not resolve hostname: {hostname}")
    if not addr.is_global or addr.is_multicast:
        raise ValueError(f"Access to non-public host not allowed: {addr}")
    return str(addr)


def _validate_image_url(url: str) -> None:
    parsed = urlparse(url)
    scheme = parsed.scheme
    if scheme not in ("http", "https"):
        raise ValueError(f"URL scheme not allowed: {scheme}")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL missing hostname")
    _resolve_hostname(hostname)


def _extract_drive_file_id(url: str) -> str | None:
    from urllib.parse import parse_qs, urlparse

    parsed = urlparse(url)
    # Handle /file/d/<id>/view pattern
    if "/file/d/" in parsed.path:
        parts = parsed.path.split("/")
        try:
            idx = parts.index("d")
            if idx + 1 < len(parts):
                return parts[idx + 1]
        except (ValueError, IndexError):
            pass
    # Fall back to query-based ids
    qs = parse_qs(parsed.query)
    ids = qs.get("id")
    if ids:
        return ids[0]
    return None


def _sanitize_filename(name: str) -> str:
    """Strip path separators so the result is a safe basename."""
    return Path(name).name


def _make_validate_url_hook() -> Any:
    def validate_request(request: httpx.Request) -> None:
        _validate_image_url(str(request.url))

    return validate_request


def _download_drive_file(file_id: str, dest_path: Path) -> None:
    from app.utils.google_service_account import get_auth_headers

    drive_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
    headers = get_auth_headers()
    MAX_IMAGE_SIZE = 10 * 1024 * 1024
    CHUNK_SIZE = 64 * 1024
    with httpx.Client(timeout=60) as client:
        with client.stream("GET", drive_url, headers=headers) as response:
            response.raise_for_status()
            total = 0
            with open(dest_path, "wb") as f:
                for chunk in response.iter_bytes(CHUNK_SIZE):
                    total += len(chunk)
                    if total > MAX_IMAGE_SIZE:
                        raise ValueError(
                            f"Image exceeds maximum size of {MAX_IMAGE_SIZE} bytes"
                        )
                    f.write(chunk)


def _download_image(
    img: dict[str, Any],
    dest: Path,
) -> None:
    file_url = img["file_url"]
    safe_name = _sanitize_filename(img["file_name"])
    dest_path = (dest / safe_name).resolve()

    if not str(dest_path).startswith(str(dest.resolve())):
        raise ValueError(f"Resolved path {dest_path} is outside destination {dest}")

    _validate_image_url(file_url)

    file_id = (
        _extract_drive_file_id(file_url) if "drive.google.com" in file_url else None
    )

    if file_id:
        _download_drive_file(file_id, dest_path)
    else:
        MAX_IMAGE_SIZE = 10 * 1024 * 1024
        CHUNK_SIZE = 64 * 1024
        with httpx.Client(
            timeout=60,
            follow_redirects=True,
            event_hooks={"request": [_make_validate_url_hook()]},
        ) as client:
            with client.stream(
                "GET", file_url, headers={"User-Agent": "Mozilla/5.0"}
            ) as response:
                response.raise_for_status()
                total = 0
                with open(dest_path, "wb") as f:
                    for chunk in response.iter_bytes(CHUNK_SIZE):
                        total += len(chunk)
                        if total > MAX_IMAGE_SIZE:
                            raise ValueError(
                                f"Image exceeds maximum size of {MAX_IMAGE_SIZE} bytes"
                            )
                        f.write(chunk)


def _ensure_tables(db: Session) -> None:
    for table_cls in [Annotation, TrainingRun]:
        if not inspect(db.get_bind()).has_table(table_cls.__tablename__):
            table = table_cls.__table__
            assert isinstance(table, Table)
            Base.metadata.create_all(bind=db.get_bind(), tables=[table])


def _ensure_metrics_column(db: Session) -> None:
    try:
        db.execute(
            text("ALTER TABLE training_runs ADD COLUMN metrics TEXT DEFAULT '[]'")
        )
        db.commit()
    except Exception:
        pass


def run_yolo_training(cfg: TrainingConfig) -> None:
    metrics_history: list[dict[str, Any]] = []
    db: Session | None = None
    work_dir = None
    output_dir = None
    try:
        _update_run(cfg.run_id, status="Running", current_epoch=0)

        os.environ["ULTRALYTICS_DISABLE_AUTOINSTALL"] = "1"
        os.environ["ULTRALYTICS_ENABLE_WANDB"] = "0"

        timestamp = time.strftime("%Y%m%d_%H%M%S")
        work_dir = (
            Path(tempfile.gettempdir()) / f"yolo_training_{cfg.run_id}_{timestamp}"
        )
        output_dir = (
            Path(tempfile.gettempdir()) / f"yolo_output_{cfg.run_id}_{timestamp}"
        )

        from ultralytics import YOLO  # type: ignore[attr-defined]

        db = SessionLocal()
        start_time = time.time()
        _ensure_tables(db)
        _ensure_metrics_column(db)

        class_map: dict[str, int] = {}
        class_names: list[str] = []
        for c in cfg.classes:
            idx = c.get("index", len(class_names))
            class_map[c["id"]] = idx
            class_names.append(c["name"])

        image_ids = [img["id"] for img in cfg.images]
        all_annotations = (
            db.query(Annotation).filter(Annotation.image_id.in_(image_ids)).all()
        )
        anns_by_image: dict[str, list[Annotation]] = {}
        for ann in all_annotations:
            anns_by_image.setdefault(ann.image_id, []).append(ann)

        # Shuffle + 70/15/15 split
        images = list(cfg.images)
        random.shuffle(images)
        n = len(images)
        if n <= 1:
            train_images = images
            val_images = images
        else:
            train_end = max(1, int(n * 0.7))
            val_end = max(train_end + 1, int(n * 0.85))
            train_images = images[:train_end]
            val_images = images[train_end:val_end] if val_end <= n else images[-1:]

        for subset_name, subset_images in [
            ("train", train_images),
            ("val", val_images),
        ]:
            img_dir = work_dir / "images" / subset_name
            label_dir = work_dir / "labels" / subset_name
            img_dir.mkdir(parents=True, exist_ok=True)
            label_dir.mkdir(parents=True, exist_ok=True)

            for img in subset_images:
                img_anns = anns_by_image.get(img["id"], [])
                yolo_lines: list[str] = []
                for ann in img_anns:
                    cls_idx = class_map.get(ann.class_id)
                    if cls_idx is None or ann.type not in ("bbox",):
                        continue
                    cx = (ann.x + ann.w / 2.0) / 100.0
                    cy = (ann.y + ann.h / 2.0) / 100.0
                    nw = ann.w / 100.0
                    nh = ann.h / 100.0
                    yolo_lines.append(f"{cls_idx} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

                label_path = label_dir / f"{Path(img['file_name']).stem}.txt"
                label_path.write_text("\n".join(yolo_lines), encoding="utf-8")

                try:
                    _download_image(img, img_dir)
                except Exception as exc:
                    print(f"Warning: failed to download {img['file_name']}: {exc}")

        db.close()
        db = SessionLocal()

        train_img_dir = work_dir / "images" / "train"
        val_img_dir = work_dir / "images" / "val"
        total_downloaded = len(list(train_img_dir.iterdir())) + len(
            list(val_img_dir.iterdir())
        )
        if total_downloaded == 0:
            raise RuntimeError(
                "No images could be downloaded from Google Drive. The access token may be expired or invalid."
            )

        data_yaml_path = work_dir / "data.yaml"
        data_yaml_path.write_text(
            f"path: {work_dir.as_posix()}\n"
            f"train: images/train\n"
            f"val: images/val\n"
            f"nc: {len(class_names)}\n"
            f"names: {json.dumps(class_names)}\n",
            encoding="utf-8",
        )

        model = YOLO("yolo11n.pt")

        last_reported = -1

        def on_epoch_end(trainer: object) -> None:
            nonlocal last_reported
            current = getattr(trainer, "epoch", -1)
            if current <= last_reported:
                return
            last_reported = current
            epoch_num = current + 1
            _update_run(cfg.run_id, current_epoch=min(epoch_num, cfg.epochs))

            event = _cancelled_runs.get(cfg.run_id)
            if event and event.is_set():
                raise RuntimeError("Training cancelled by user")

            ep_metrics: dict[str, Any] = {"epoch": epoch_num}

            # accuracy from trainer.metrics
            m = getattr(trainer, "metrics", None)
            if m is not None:
                if isinstance(m, dict):
                    map50 = m.get("mAP50(B)")
                    if map50 is None:
                        map50 = m.get("metrics/mAP50(B)")
                    if map50 is None:
                        map50 = m.get("map50")
                else:
                    map50 = getattr(m, "map50", None)
                if map50 is not None:
                    ep_metrics["accuracy"] = float(map50)

            # loss from trainer.tloss (running average training loss)
            tloss = getattr(trainer, "tloss", None)
            if tloss is not None:
                try:
                    if hasattr(tloss, "numel") and tloss.numel() > 0:
                        ep_metrics["loss"] = float(tloss.sum())
                    else:
                        ep_metrics["loss"] = float(tloss)
                except (TypeError, ValueError):
                    pass

            metrics_history.append(ep_metrics)
            try:
                _update_run(cfg.run_id, metrics=json.dumps(metrics_history))
            except Exception:
                pass

            # only pass extracted values (don't overwrite with None)
            update_payload: dict[str, Any] = {}
            if "accuracy" in ep_metrics:
                update_payload["accuracy"] = ep_metrics["accuracy"]
            if "loss" in ep_metrics:
                update_payload["loss"] = ep_metrics["loss"]
            if update_payload:
                try:
                    _update_run(cfg.run_id, **update_payload)
                except Exception:
                    pass

        model.add_callback("on_train_epoch_end", on_epoch_end)

        num_train = len(train_images)
        batch_size = min(4, max(1, num_train))
        model.train(
            data=str(data_yaml_path),
            epochs=cfg.epochs,
            project=str(output_dir),
            name="train",
            exist_ok=True,
            verbose=True,
            patience=20,
            batch=batch_size,
        )

        best_model_path = output_dir / "train" / "weights" / "best.pt"
        if best_model_path.exists():
            model_dir = MODELS_DIR / str(cfg.run_id)
            model_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(best_model_path), str(model_dir / "best.pt"))

        final_epoch = cfg.epochs

        # use model.metrics from the last validation epoch
        final_accuracy = None
        final_loss = None
        metrics_obj = getattr(model, "metrics", None)
        if metrics_obj is not None:
            if isinstance(metrics_obj, dict):
                final_accuracy = metrics_obj.get("mAP50(B)")
                if final_accuracy is None:
                    final_accuracy = metrics_obj.get("metrics/mAP50(B)")
            else:
                final_accuracy = getattr(metrics_obj, "map50", None)
            if final_accuracy is not None:
                final_accuracy = float(final_accuracy)

        # loss from callback history (not available in metrics)
        if metrics_history:
            best = max(metrics_history, key=lambda e: e.get("accuracy", 0) or 0)
            if final_accuracy is None:
                final_accuracy = best.get("accuracy")
            final_loss = best.get("loss")

        update_kwargs: dict[str, Any] = {
            "status": "Completed",
            "current_epoch": final_epoch,
            "duration": time.strftime(
                "%Hh %Mm %Ss", time.gmtime(time.time() - start_time)
            ),
        }
        if final_accuracy is not None:
            update_kwargs["accuracy"] = final_accuracy
        if final_loss is not None:
            update_kwargs["loss"] = final_loss
        try:
            _update_run(cfg.run_id, **update_kwargs)
        except Exception:
            _update_run(cfg.run_id, status="Completed", current_epoch=final_epoch)

        shutil.rmtree(work_dir, ignore_errors=True)
        shutil.rmtree(output_dir, ignore_errors=True)

    except Exception as exc:
        _update_run(
            cfg.run_id,
            status="Failed",
            error_message=str(exc),
            metrics=json.dumps(metrics_history),
        )
        if work_dir is not None:
            shutil.rmtree(work_dir, ignore_errors=True)
        if output_dir is not None:
            shutil.rmtree(output_dir, ignore_errors=True)

    finally:
        _cancelled_runs.pop(cfg.run_id, None)
        if db is not None:
            try:
                db.close()
            except Exception:
                pass
