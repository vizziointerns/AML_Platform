import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import inspect, Table
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import get_db
from app.models.annotation import Annotation
from app.schemas.annotation import (
    AnnotationIn,
    AnnotationListOut,
    AnnotationOut,
    AnnotationDeleteRequest,
)

router = APIRouter()


def _ensure_table(db: Session) -> None:
    if not inspect(db.get_bind()).has_table("annotations"):
        table = Annotation.__table__
        assert isinstance(table, Table)
        Base.metadata.create_all(bind=db.get_bind(), tables=[table])


def _row_to_out(row: Annotation) -> AnnotationOut:
    points = None
    if row.points:
        try:
            raw = json.loads(row.points)
            points = [{"x": p["x"], "y": p["y"]} for p in raw]
        except (json.JSONDecodeError, KeyError, TypeError):
            points = None

    lines = None
    if row.lines:
        try:
            raw = json.loads(row.lines)
            lines = [
                {
                    "points": item["points"],
                    "brush_size": item["brush_size"],
                    "tool": item["tool"],
                }
                for item in raw
            ]
        except (json.JSONDecodeError, KeyError, TypeError):
            lines = None

    return AnnotationOut(
        id=row.id,
        image_id=row.image_id,
        annotation_id=row.annotation_id,
        type=row.type,
        class_id=row.class_id,
        x=row.x,
        y=row.y,
        w=row.w,
        h=row.h,
        points=points,
        lines=lines,
    )


@router.get("/annotations/{image_id}", response_model=AnnotationListOut)
def get_annotations(image_id: str, db: Session = Depends(get_db)) -> AnnotationListOut:
    _ensure_table(db)
    rows = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    return AnnotationListOut(annotations=[_row_to_out(r) for r in rows])


@router.post("/annotations/{image_id}", response_model=AnnotationListOut)
def save_annotations(
    image_id: str,
    body: list[AnnotationIn],
    db: Session = Depends(get_db),
) -> AnnotationListOut:
    _ensure_table(db)

    existing = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    existing_map = {e.annotation_id: e for e in existing}
    incoming_ids = {a.annotation_id for a in body}
    processed_ids: set[str] = set()

    for item in body:
        if item.annotation_id in processed_ids:
            continue
        points_json = None
        if item.points is not None:
            points_json = json.dumps([p.model_dump() for p in item.points])
        lines_json = None
        if item.lines is not None:
            lines_json = json.dumps([l.model_dump() for l in item.lines])

        if item.annotation_id in existing_map:
            row = existing_map[item.annotation_id]
            row.type = item.type
            row.class_id = item.class_id
            row.x = item.x
            row.y = item.y
            row.w = item.w
            row.h = item.h
            row.points = points_json
            row.lines = lines_json
        else:
            row = Annotation(
                image_id=image_id,
                annotation_id=item.annotation_id,
                type=item.type,
                class_id=item.class_id,
                x=item.x,
                y=item.y,
                w=item.w,
                h=item.h,
                points=points_json,
                lines=lines_json,
            )
            db.add(row)

        processed_ids.add(item.annotation_id)

    for ann_id, row in existing_map.items():
        if ann_id not in incoming_ids:
            db.delete(row)

    db.commit()

    rows = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    return AnnotationListOut(annotations=[_row_to_out(r) for r in rows])


class BatchAnnotationIn(BaseModel):
    image_id: str
    annotations: list[AnnotationIn]


class BatchAnnotationsIn(BaseModel):
    datasets: list[BatchAnnotationIn]


class BatchAnnotationsOut(BaseModel):
    results: list[AnnotationListOut]


@router.post("/annotations/batch", response_model=BatchAnnotationsOut)
def save_annotations_batch(
    body: BatchAnnotationsIn,
    db: Session = Depends(get_db),
) -> BatchAnnotationsOut:
    """Save annotations for multiple images in a single request."""
    _ensure_table(db)
    results: list[AnnotationListOut] = []

    for dataset in body.datasets:
        image_id = dataset.image_id
        incoming = dataset.annotations

        existing = db.query(Annotation).filter(Annotation.image_id == image_id).all()
        existing_map = {e.annotation_id: e for e in existing}
        incoming_ids = {a.annotation_id for a in incoming}
        processed_ids: set[str] = set()

        for item in incoming:
            if item.annotation_id in processed_ids:
                continue
            points_json = None
            if item.points is not None:
                points_json = json.dumps([p.model_dump() for p in item.points])
            lines_json = None
            if item.lines is not None:
                lines_json = json.dumps([l.model_dump() for l in item.lines])

            if item.annotation_id in existing_map:
                row = existing_map[item.annotation_id]
                row.type = item.type
                row.class_id = item.class_id
                row.x = item.x
                row.y = item.y
                row.w = item.w
                row.h = item.h
                row.points = points_json
                row.lines = lines_json
            else:
                row = Annotation(
                    image_id=image_id,
                    annotation_id=item.annotation_id,
                    type=item.type,
                    class_id=item.class_id,
                    x=item.x,
                    y=item.y,
                    w=item.w,
                    h=item.h,
                    points=points_json,
                    lines=lines_json,
                )
                db.add(row)

            processed_ids.add(item.annotation_id)

        for ann_id, row in existing_map.items():
            if ann_id not in incoming_ids:
                db.delete(row)

    db.commit()

    for dataset in body.datasets:
        rows = db.query(Annotation).filter(Annotation.image_id == dataset.image_id).all()
        results.append(AnnotationListOut(annotations=[_row_to_out(r) for r in rows]))

    return BatchAnnotationsOut(results=results)


@router.delete("/annotations/{image_id}", response_model=AnnotationListOut)
def delete_annotations(
    image_id: str,
    body: AnnotationDeleteRequest,
    db: Session = Depends(get_db),
) -> AnnotationListOut:
    _ensure_table(db)
    db.query(Annotation).filter(
        Annotation.image_id == image_id,
        Annotation.annotation_id.in_(body.annotation_ids),
    ).delete(synchronize_session=False)
    db.commit()

    rows = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    return AnnotationListOut(annotations=[_row_to_out(r) for r in rows])
