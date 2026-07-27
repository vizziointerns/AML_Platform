import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)
from fastapi.responses import FileResponse
from sqlalchemy import inspect, Table, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import get_db
from app.models.training import TrainingRun
from app.schemas.training import (
    TrainingRunCreate,
    TrainingRunListOut,
    TrainingRunOut,
    TrainingRunUpdate,
    TrainingStartPayload,
)
from app.training.trainer import TrainingConfig, start_training_background, cancel_run

router = APIRouter()


def _ensure_table(db: Session) -> None:
    if not inspect(db.get_bind()).has_table("training_runs"):
        table = TrainingRun.__table__
        assert isinstance(table, Table)
        Base.metadata.create_all(bind=db.get_bind(), tables=[table])
    try:
        db.execute(
            text("ALTER TABLE training_runs ADD COLUMN metrics TEXT DEFAULT '[]'")
        )
        db.commit()
    except Exception:
        pass
    try:
        db.execute(
            text("ALTER TABLE training_runs RENAME COLUMN model_type TO task_type")
        )
        db.commit()
    except Exception:
        pass


def _row_to_out(row: TrainingRun) -> TrainingRunOut | None:
    try:
        metrics_val = row.metrics
    except AttributeError:
        metrics_val = None

    if row.task_type not in ("detect", "segment"):
        logger.warning("Skipping training run %s: invalid task_type '%s'", row.id, row.task_type)
        return None

    return TrainingRunOut(
        id=row.id,
        project_id=row.project_id,
        dataset_id=row.dataset_id,
        name=row.name,
        task_type=row.task_type,
        epochs=row.epochs,
        status=row.status,
        accuracy=row.accuracy,
        loss=row.loss,
        current_epoch=row.current_epoch,
        duration=row.duration,
        created_at=row.created_at,
        started_at=row.started_at,
        completed_at=row.completed_at,
        error_message=row.error_message,
        metrics=metrics_val,
    )


@router.get("/training/{project_id}", response_model=TrainingRunListOut)
def list_training_runs(
    project_id: str, db: Session = Depends(get_db)
) -> TrainingRunListOut:
    _ensure_table(db)
    rows = (
        db.query(TrainingRun)
        .filter(TrainingRun.project_id == project_id)
        .order_by(TrainingRun.id.desc())
        .all()
    )
    return TrainingRunListOut(runs=[r for r in (_row_to_out(r) for r in rows) if r is not None])


@router.get("/training/{project_id}/{run_id}", response_model=TrainingRunOut)
def get_training_run(
    project_id: str, run_id: int, db: Session = Depends(get_db)
) -> TrainingRunOut:
    _ensure_table(db)
    row = (
        db.query(TrainingRun)
        .filter(TrainingRun.id == run_id, TrainingRun.project_id == project_id)
        .first()
    )
    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Training run not found")
    result = _row_to_out(row)
    if result is None:
        raise HTTPException(status_code=404, detail="Training run has invalid data")
    return result


@router.post("/training/{project_id}", response_model=TrainingRunOut, status_code=201)
def create_training_run(
    project_id: str, body: TrainingRunCreate, db: Session = Depends(get_db)
) -> TrainingRunOut:
    _ensure_table(db)
    row = TrainingRun(
        project_id=project_id,
        dataset_id=body.dataset_id,
        name=body.name,
        task_type=body.task_type,
        epochs=body.epochs,
        status="queued",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    result = _row_to_out(row)
    assert result is not None, "Newly created run should have valid task_type"
    return result


@router.patch("/training/{project_id}/{run_id}", response_model=TrainingRunOut)
def update_training_run(
    project_id: str, run_id: int, body: TrainingRunUpdate, db: Session = Depends(get_db)
) -> TrainingRunOut:
    _ensure_table(db)
    row = (
        db.query(TrainingRun)
        .filter(TrainingRun.id == run_id, TrainingRun.project_id == project_id)
        .first()
    )
    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Training run not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    result = _row_to_out(row)
    assert result is not None, "Updated run should have valid task_type"
    return result


@router.post("/training/{project_id}/{run_id}/start", response_model=TrainingRunOut)
def start_training(
    project_id: str,
    run_id: int,
    body: TrainingStartPayload,
    db: Session = Depends(get_db),
) -> TrainingRunOut:
    _ensure_table(db)
    row = (
        db.query(TrainingRun)
        .filter(TrainingRun.id == run_id, TrainingRun.project_id == project_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Training run not found")
    if row.status.lower() not in ("queued",):
        raise HTTPException(
            status_code=400, detail=f"Training run is already {row.status}"
        )

    if not body.images:
        raise HTTPException(status_code=400, detail="No images provided for training")
    if not body.classes:
        raise HTTPException(status_code=400, detail="No classes provided for training")

    row.status = "queued"
    row.started_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(row)

    cfg = TrainingConfig.from_api(
        run_id=run_id,
        project_id=project_id,
        dataset_id=row.dataset_id,
        images=[img.model_dump() for img in body.images],
        classes=[c.model_dump() for c in body.classes],
        epochs=row.epochs,
        task_type=row.task_type,
    )
    try:
        start_training_background(cfg)
    except ImportError as e:
        logger.exception("Failed to import training module")
        row.status = "Failed"
        row.error_message = f"Training module import error: {e}"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Training module not available: {e}") from e
    except Exception as e:
        logger.exception("Failed to start training background task")
        row.status = "Failed"
        row.error_message = f"Failed to start training: {e}"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to start training: {e}") from e

    result = _row_to_out(row)
    assert result is not None, "Started run should have valid task_type"
    return result


@router.get("/training/{project_id}/{run_id}/weights")
def download_weights(
    project_id: str, run_id: int, db: Session = Depends(get_db)
) -> FileResponse:
    row = (
        db.query(TrainingRun)
        .filter(TrainingRun.id == run_id, TrainingRun.project_id == project_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Training run not found")
    if row.status != "Completed":
        raise HTTPException(status_code=400, detail="Training run is not completed")

    weights_path = (
        Path(__file__).resolve().parent.parent.parent.parent
        / "models"
        / str(run_id)
        / "best.pt"
    )
    if not weights_path.exists():
        raise HTTPException(status_code=404, detail="Model weights not found")

    return FileResponse(
        str(weights_path),
        media_type="application/octet-stream",
        filename=f"model_{run_id}_best.pt",
    )


@router.delete("/training/{project_id}/{run_id}", status_code=204)
def delete_training_run(
    project_id: str, run_id: int, db: Session = Depends(get_db)
) -> None:
    cancel_run(run_id)
    _ensure_table(db)
    row = (
        db.query(TrainingRun)
        .filter(TrainingRun.id == run_id, TrainingRun.project_id == project_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Training run not found")

    import shutil

    model_path = (
        Path(__file__).resolve().parent.parent.parent.parent / "models" / str(run_id)
    )
    if model_path.exists():
        shutil.rmtree(str(model_path), ignore_errors=True)

    db.delete(row)
    db.commit()
