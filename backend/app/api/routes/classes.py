from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import inspect, Table
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import get_db
from app.models.class_label import ClassLabel
from app.schemas.class_label import (
    ClassLabelCreate,
    ClassLabelListOut,
    ClassLabelOut,
    ClassLabelReorder,
)

router = APIRouter()


def _ensure_table(db: Session) -> None:
    if not inspect(db.get_bind()).has_table("class_labels"):
        table = ClassLabel.__table__
        assert isinstance(table, Table)
        Base.metadata.create_all(bind=db.get_bind(), tables=[table])


def _row_to_out(row: ClassLabel) -> ClassLabelOut:
    return ClassLabelOut(
        id=row.id,
        dataset_id=row.dataset_id,
        class_id=row.class_id,
        name=row.name,
        color=row.color,
        index=row.index,
    )


@router.get("/classes/{dataset_id}", response_model=ClassLabelListOut)
def list_classes(dataset_id: str, db: Session = Depends(get_db)) -> ClassLabelListOut:
    _ensure_table(db)
    rows = (
        db.query(ClassLabel)
        .filter(ClassLabel.dataset_id == dataset_id)
        .order_by(ClassLabel.index)
        .all()
    )
    return ClassLabelListOut(classes=[_row_to_out(r) for r in rows])


@router.put("/classes/{dataset_id}", response_model=ClassLabelListOut)
def save_classes(
    dataset_id: str,
    body: list[ClassLabelCreate],
    db: Session = Depends(get_db),
) -> ClassLabelListOut:
    _ensure_table(db)
    db.query(ClassLabel).filter(ClassLabel.dataset_id == dataset_id).delete()
    rows: list[ClassLabel] = []
    for idx, item in enumerate(body):
        row = ClassLabel(
            dataset_id=dataset_id,
            class_id=item.class_id,
            name=item.name,
            color=item.color,
            index=idx,
        )
        db.add(row)
        rows.append(row)
    db.commit()
    for r in rows:
        db.refresh(r)
    return ClassLabelListOut(classes=[_row_to_out(r) for r in rows])


@router.put("/classes/{dataset_id}/reorder", response_model=ClassLabelListOut)
def reorder_classes(
    dataset_id: str,
    body: ClassLabelReorder,
    db: Session = Depends(get_db),
) -> ClassLabelListOut:
    _ensure_table(db)
    existing = db.query(ClassLabel).filter(ClassLabel.dataset_id == dataset_id).all()
    existing_ids = {c.class_id for c in existing}
    body_ids = set(body.class_ids)
    if existing_ids != body_ids:
        missing = existing_ids - body_ids
        extra = body_ids - existing_ids
        msg = "class_ids mismatch"
        if missing:
            msg += f"; missing: {sorted(missing)}"
        if extra:
            msg += f"; unknown: {sorted(extra)}"
        raise HTTPException(status_code=422, detail=msg)
    existing_map = {c.class_id: c for c in existing}
    rows: list[ClassLabel] = []
    for idx, class_id in enumerate(body.class_ids):
        row = existing_map[class_id]
        row.index = idx
        rows.append(row)
    db.commit()
    rows.sort(key=lambda r: r.index)
    return ClassLabelListOut(classes=[_row_to_out(r) for r in rows])
