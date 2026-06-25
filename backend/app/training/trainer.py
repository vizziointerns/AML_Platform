import json
import os
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


def _extract_drive_file_id(url: str) -> str | None:
	from urllib.parse import parse_qs, urlparse

	parsed = urlparse(url)
	qs = parse_qs(parsed.query)
	ids = qs.get("id")
	if ids:
		return ids[0]
	return None


def _download_image(
	img: dict[str, Any],
	dest: Path,
	google_access_token: str | None,
) -> None:
	file_url = img["file_url"]
	file_name = img["file_name"]

	_validate_image_url(file_url)

	file_id = _extract_drive_file_id(file_url) if "drive.google.com" in file_url else None

	if file_id and google_access_token:
		drive_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
		response = httpx.get(
			drive_url,
			timeout=60,
			headers={
				"Authorization": f"Bearer {google_access_token}",
				"User-Agent": "Mozilla/5.0",
			},
		)
		response.raise_for_status()
		(dest / file_name).write_bytes(response.content)
	else:
		response = httpx.get(
			file_url,
			timeout=60,
			follow_redirects=True,
			headers={"User-Agent": "Mozilla/5.0"},
		)
		response.raise_for_status()
		(dest / file_name).write_bytes(response.content)


class TrainingConfig:
	def __init__(
		self,
		run_id: int,
		project_id: str,
		dataset_id: str,
		images: list[dict[str, Any]],
		classes: list[dict[str, Any]],
		epochs: int,
		google_access_token: str | None = None,
		model_type: str = "yolo11n",
	):
		self.run_id = run_id
		self.project_id = project_id
		self.dataset_id = dataset_id
		self.images = images
		self.classes = classes
		self.epochs = epochs
		self.google_access_token = google_access_token
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
		google_access_token: str | None = None,
	) -> "TrainingConfig":
		return cls(
			run_id=run_id,
			project_id=project_id,
			dataset_id=dataset_id,
			images=images,
			classes=classes,
			epochs=epochs,
			google_access_token=google_access_token,
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
	metrics_history: list[dict[str, Any]] = []
	db: Session | None = None
	try:
		_update_run(cfg.run_id, status="Running", current_epoch=0)

		os.environ["ULTRALYTICS_DISABLE_AUTOINSTALL"] = "1"
		os.environ["ULTRALYTICS_ENABLE_WANDB"] = "0"

		timestamp = time.strftime("%Y%m%d_%H%M%S")
		work_dir = Path(tempfile.gettempdir()) / f"yolo_training_{cfg.run_id}_{timestamp}"
		output_dir = Path(tempfile.gettempdir()) / f"yolo_output_{cfg.run_id}_{timestamp}"

		from ultralytics import YOLO

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
				_download_image(img, img_dir, cfg.google_access_token)
			except Exception as exc:
				print(f"Warning: failed to download {img['file_name']}: {exc}")

		db.close()
		db = SessionLocal()

		downloaded_count = len(list(img_dir.iterdir()))
		if downloaded_count == 0:
			raise RuntimeError("No images could be downloaded from Google Drive. The access token may be expired or invalid.")

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
		results = model.train(
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
			"duration": time.strftime("%Hh %Mm %Ss", time.gmtime(time.time() - start_time)),
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
		import traceback

		tb = traceback.format_exc()
		_update_run(cfg.run_id, status="Failed", error_message=str(exc), metrics=json.dumps(metrics_history))
		shutil.rmtree(work_dir, ignore_errors=True)
		shutil.rmtree(output_dir, ignore_errors=True)

	finally:
		_cancelled_runs.pop(cfg.run_id, None)
		if db is not None:
			try:
				db.close()
			except Exception:
				pass


def start_training_background(cfg: TrainingConfig) -> None:
	_cancelled_runs[cfg.run_id] = threading.Event()
	thread = threading.Thread(target=run_training, args=(cfg,), daemon=True)
	thread.start()
