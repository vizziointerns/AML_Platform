import json
import random
import shutil
import tempfile
import threading
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

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"

_cancelled_runs: dict[int, threading.Event] = {}


def _validate_image_url(url: str) -> None:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if host in ("169.254.169.254", "127.0.0.1", "localhost", "0.0.0.0"):
        raise ValueError(f"URL host not allowed: {host}")


class TrainingConfig:
    def __init__(
        self,
        run_id: int,
        project_id: str,
        dataset_id: str,
        images: list[dict[str, Any]],
        classes: list[dict[str, Any]],
        epochs: int,
        model_type: str = "yolo11n",
    ):
        self.run_id = run_id
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.images = images
        self.classes = classes
        self.epochs = epochs
        self.model_type = model_type

    @classmethod
    def from_api(
        cls,
        run_id: int,
        project_id: str,
        dataset_id: str,
        images: list[dict[str, Any]],
        classes: list[dict[str, Any]],
        epochs: int,
    ) -> "TrainingConfig":
        return cls(
            run_id=run_id,
            project_id=project_id,
            dataset_id=dataset_id,
            images=images,
            classes=classes,
            epochs=epochs,
        )


def _update_run(run_id: int, **kwargs: Any) -> None:
    db = SessionLocal()
    try:
        run = db.query(TrainingRun).filter(TrainingRun.id == run_id).first()
        if run:
            for key, value in kwargs.items():
                setattr(run, key, value)
            db.commit()
    except Exception:
        pass
    finally:
        db.close()


def _ensure_tables(db: Session) -> None:
    for table_cls in [Annotation, TrainingRun]:
        if not inspect(db.get_bind()).has_table(table_cls.__tablename__):
            table = table_cls.__table__
            assert isinstance(table, Table)
            Base.metadata.create_all(bind=db.get_bind(), tables=[table])


def _ensure_metrics_column(db: Session) -> None:
    try:
        db.execute(text("ALTER TABLE training_runs ADD COLUMN metrics TEXT DEFAULT '[]'"))
        db.commit()
    except Exception:
        pass


def cancel_run(run_id: int) -> None:
    event = _cancelled_runs.get(run_id)
    if event:
        event.set()


def run_training(cfg: TrainingConfig) -> None:
    _update_run(cfg.run_id, status="Running", current_epoch=0)

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    work_dir = Path(tempfile.gettempdir()) / f"yolo_training_{cfg.run_id}_{timestamp}"
    output_dir = Path(tempfile.gettempdir()) / f"yolo_output_{cfg.run_id}_{timestamp}"

    from ultralytics import YOLO  # type: ignore[attr-defined]

    metrics_history: list[dict[str, Any]] = []
    db = SessionLocal()
    start_time = time.time()
    try:
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
            db.query(Annotation)
            .filter(Annotation.image_id.in_(image_ids))
            .all()
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

        for subset_name, subset_images in [("train", train_images), ("val", val_images)]:
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
                    _validate_image_url(img["file_url"])
                    response = httpx.get(img["file_url"], timeout=60, follow_redirects=False)
                    response.raise_for_status()
                    (img_dir / img["file_name"]).write_bytes(response.content)
                except Exception as exc:
                    print(f"Warning: failed to download {img['file_name']}: {exc}")

        db.close()
        db = SessionLocal()

        data_yaml_path = work_dir / "data.yaml"
        data_yaml_path.write_text(
            f"path: {work_dir.as_posix()}\n"
            f"train: images/train\n"
            f"val: images/val\n"
            f"nc: {len(class_names)}\n"
            f"names: {json.dumps(class_names)}\n",
            encoding="utf-8",
        )

        model = YOLO(f"{cfg.model_type}.pt")

        last_reported = -1

        def on_epoch_end(trainer: object) -> None:
            nonlocal last_reported
            current = getattr(trainer, "epoch", -1)
            if current <= last_reported:
                return
            last_reported = current
            epoch_num = current + 1
            _update_run(cfg.run_id, current_epoch=min(epoch_num, cfg.epochs))

            # check cancellation
            event = _cancelled_runs.get(cfg.run_id)
            if event and event.is_set():
                raise RuntimeError("Training cancelled by user")

            # collect metrics from trainer
            ep_metrics: dict[str, Any] = {"epoch": epoch_num}
            if hasattr(trainer, "metrics"):
                m = trainer.metrics
                if hasattr(m, "map50"):
                    ep_metrics["accuracy"] = float(m.map50)
                if hasattr(m, "map50_95"):
                    ep_metrics["map50_95"] = float(m.map50_95)
            if hasattr(trainer, "loss") and trainer.loss is not None:
                loss_vals = trainer.loss
                if isinstance(loss_vals, (int, float)):
                    ep_metrics["loss"] = float(loss_vals)
                elif hasattr(loss_vals, "dim") and loss_vals.dim() == 0:
                    ep_metrics["loss"] = float(loss_vals.item())
                elif len(loss_vals) > 0:
                    ep_metrics["loss"] = float(loss_vals[0])

            metrics_history.append(ep_metrics)
            try:
                _update_run(cfg.run_id, metrics=json.dumps(metrics_history))
            except Exception:
                pass

            if "accuracy" in ep_metrics or "loss" in ep_metrics:
                try:
                    _update_run(
                        cfg.run_id,
                        accuracy=ep_metrics.get("accuracy"),
                        loss=ep_metrics.get("loss"),
                    )
                except Exception:
                    pass

        model.add_callback("on_train_epoch_end", on_epoch_end)

        num_train = len(train_images)
        batch_size = min(4, max(1, num_train))
        results = model.train(
            data=str(data_yaml_path),
            epochs=cfg.epochs,
            project=str(output_dir),
            name="train",
            exist_ok=True,
            verbose=False,
            patience=20,
            batch=batch_size,
        )

        best_model_path = output_dir / "train" / "weights" / "best.pt"
        if best_model_path.exists():
            model_dir = MODELS_DIR / str(cfg.run_id)
            model_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(str(best_model_path), str(model_dir / "best.pt"))

        final_epoch = cfg.epochs
        final_accuracy = None
        final_loss = None
        if hasattr(results, "box"):
            box_map = getattr(results.box, "map50", None)
            if box_map is not None:
                final_accuracy = float(box_map)
        if hasattr(results, "loss") and results.loss is not None:
            losses = results.loss
            if isinstance(losses, (int, float)):
                final_loss = float(losses)
            elif hasattr(losses, "dim") and losses.dim() == 0:
                final_loss = float(losses.item())
            elif len(losses) > 0:
                final_loss = float(losses[-1])

        try:
            _update_run(
                cfg.run_id,
                status="Completed",
                current_epoch=final_epoch,
                accuracy=final_accuracy,
                loss=final_loss,
                duration=time.strftime("%Hh %Mm %Ss", time.gmtime(time.time() - start_time)),
            )
        except Exception:
            _update_run(cfg.run_id, status="Completed", current_epoch=final_epoch)

        shutil.rmtree(work_dir, ignore_errors=True)
        shutil.rmtree(output_dir, ignore_errors=True)

    except Exception as exc:
        import traceback

        tb = traceback.format_exc()
        _update_run(cfg.run_id, status="Failed", error_message=str(exc), metrics=json.dumps(metrics_history))
        shutil.rmtree(work_dir, ignore_errors=True)
        shutil.rmtree(output_dir, ignore_errors=True)

    finally:
        _cancelled_runs.pop(cfg.run_id, None)
        try:
            db.close()
        except Exception:
            pass


def start_training_background(cfg: TrainingConfig) -> None:
    _cancelled_runs[cfg.run_id] = threading.Event()
    thread = threading.Thread(target=run_training, args=(cfg,), daemon=True)
    thread.start()
