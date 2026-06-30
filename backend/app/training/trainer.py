import queue
import threading
from pathlib import Path
from typing import Any

from app.db.session import SessionLocal
from app.models.training import TrainingRun

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"

_cancelled_runs: dict[int, threading.Event] = {}


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


def cancel_run(run_id: int) -> None:
	event = _cancelled_runs.get(run_id)
	if event:
		event.set()


def run_training(cfg: TrainingConfig) -> None:
	# Query project to determine task_type
	db = SessionLocal()
	task_type = "detect"
	try:
		from app.models.project import Project
		project = db.query(Project).filter(Project.id == cfg.project_id).first()
		if project and project.task_type:
			task_type = project.task_type
	except Exception:
		pass
	finally:
		db.close()

	if task_type == "segment":
		from app.training.trainer_sam import run_sam_training
		run_sam_training(cfg)
	else:
		from app.training.trainer_yolo import run_yolo_training
		run_yolo_training(cfg)


_training_queue: queue.Queue["TrainingConfig"] = queue.Queue()

def _worker_loop() -> None:
	while True:
		cfg = _training_queue.get()
		if cfg is None:
			break
		try:
			run_training(cfg)
		except Exception:
			pass
		finally:
			_training_queue.task_done()

# Start a single daemon worker thread to process training jobs sequentially
_worker_thread = threading.Thread(target=_worker_loop, daemon=True)
_worker_thread.start()


def start_training_background(cfg: TrainingConfig) -> None:
	_cancelled_runs[cfg.run_id] = threading.Event()
	_training_queue.put(cfg)
