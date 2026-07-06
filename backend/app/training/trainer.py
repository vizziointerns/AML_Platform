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
        task_type: str = "detect",
    ):
        self.run_id = run_id
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.images = images
        self.classes = classes
        self.epochs = epochs
        self.google_access_token = google_access_token
        self.task_type = task_type

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
        task_type: str = "detect",
    ) -> "TrainingConfig":
        return cls(
            run_id=run_id,
            project_id=project_id,
            dataset_id=dataset_id,
            images=images,
            classes=classes,
            epochs=epochs,
            google_access_token=google_access_token,
            task_type=task_type,
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


def run_sam_training(cfg: TrainingConfig) -> None:
    _update_run(
        cfg.run_id,
        status="Failed",
        error_message="SAM training is not implemented in this version",
    )
    _cancelled_runs.pop(cfg.run_id, None)


def start_training_background(cfg: TrainingConfig) -> None:
    _cancelled_runs[cfg.run_id] = threading.Event()
    if cfg.task_type == "detect":
        from app.training.trainer_yolo import run_yolo_training as _run_yolo

        handler = _run_yolo
    elif cfg.task_type == "segment":
        from app.training.trainer_sam import run_sam_training as _run_sam

        handler = _run_sam
    else:
        _update_run(
            cfg.run_id,
            status="Failed",
            error_message=f"Unknown task type: {cfg.task_type}",
        )
        return
    thread = threading.Thread(target=handler, args=(cfg,), daemon=True)
    thread.start()
