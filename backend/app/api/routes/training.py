from fastapi import APIRouter, Depends
from sqlalchemy import inspect, Table
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import get_db
from app.models.training import TrainingRun
from app.schemas.training import (
    TrainingRunCreate,
    TrainingRunListOut,
    TrainingRunOut,
    TrainingRunUpdate,
)

router = APIRouter()


def _ensure_table(db: Session) -> None:
    if not inspect(db.get_bind()).has_table("training_runs"):
        table = TrainingRun.__table__
        assert isinstance(table, Table)
        Base.metadata.create_all(bind=db.get_bind(), tables=[table])


def _row_to_out(row: TrainingRun) -> TrainingRunOut:
    return TrainingRunOut(
        id=row.id,
        project_id=row.project_id,
        dataset_id=row.dataset_id,
        name=row.name,
        model_type=row.model_type,
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
    )


@router.get("/training/{project_id}", response_model=TrainingRunListOut)
def list_training_runs(project_id: str, db: Session = Depends(get_db)) -> TrainingRunListOut:
    _ensure_table(db)
    rows = (
        db.query(TrainingRun)
        .filter(TrainingRun.project_id == project_id)
        .order_by(TrainingRun.id.desc())
        .all()
    )
    return TrainingRunListOut(runs=[_row_to_out(r) for r in rows])


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
    return _row_to_out(row)


@router.post("/training/{project_id}", response_model=TrainingRunOut, status_code=201)
def create_training_run(
    project_id: str, body: TrainingRunCreate, db: Session = Depends(get_db)
) -> TrainingRunOut:
    _ensure_table(db)
    row = TrainingRun(
        project_id=project_id,
        dataset_id=body.dataset_id,
        name=body.name,
        model_type=body.model_type,
        epochs=body.epochs,
        status="queued",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_out(row)


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
    return _row_to_out(row)


@router.delete("/training/{project_id}/{run_id}", status_code=204)
def delete_training_run(project_id: str, run_id: int, db: Session = Depends(get_db)) -> None:
    _ensure_table(db)
    row = (
        db.query(TrainingRun)
        .filter(TrainingRun.id == run_id, TrainingRun.project_id == project_id)
        .first()
    )
    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Training run not found")
    db.delete(row)
    db.commit()
