import io
import json
import logging
import os
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import inspect, Table
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import get_db
from app.models.annotation import Annotation
from app.models.class_label import ClassLabel

logger = logging.getLogger(__name__)
router = APIRouter()


class ExportImage(BaseModel):
    id: str
    file_name: str
    width: int
    height: int
    file_url: str


class ExportClass(BaseModel):
    id: str
    name: str
    index: int


class ExportRequest(BaseModel):
    dataset_id: str
    images: list[ExportImage]
    classes: list[ExportClass]
    split_ratio: float = 0.8


class ExportResponse(BaseModel):
    download_url: str | None = None
    message: str


def _ensure_tables(db: Session) -> None:
    for table_cls in [Annotation, ClassLabel]:
        if not inspect(db.get_bind()).has_table(table_cls.__tablename__):
            table = table_cls.__table__
            assert isinstance(table, Table)
            Base.metadata.create_all(bind=db.get_bind(), tables=[table])


def _make_data_yaml(
    class_names: list[str],
    dataset_dir: str,
) -> str:
    lines = [
        f"path: {dataset_dir}",
        "train: images/train",
        "val: images/val",
        "",
        "nc: " + str(len(class_names)),
        "names: " + json.dumps(class_names),
        "",
    ]
    return "\n".join(lines)


_ALLOWED_HOSTS: set[str] = set()


def _validate_image_url(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if _ALLOWED_HOSTS and host not in _ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail=f"URL host not allowed: {host}")
    return url


@router.post("/datasets/export/yolo")
def export_yolo(
    body: ExportRequest,
    db: Session = Depends(get_db),
) -> Response:
    """Export annotations in YOLO format as a ZIP file.

    Accepts image metadata and class definitions, generates
    YOLO .txt label files + data.yaml, downloads images,
    and returns a ZIP archive ready for training.

    Note: Only bounding-box (bbox) annotations are included in the export.
    Polygon, mask, and other annotation types are silently skipped.
    """
    _ensure_tables(db)

    if not body.images:
        raise HTTPException(status_code=400, detail="No images provided")
    if not body.classes:
        raise HTTPException(status_code=400, detail="No classes provided")

    class_map: dict[str, int] = {c.id: c.index for c in body.classes}
    class_names: list[str] = [""] * len(body.classes)
    for c in body.classes:
        if 0 <= c.index < len(class_names):
            class_names[c.index] = c.name

    image_ids = [img.id for img in body.images]
    all_annotations = (
        db.query(Annotation)
        .filter(Annotation.image_id.in_(image_ids))
        .all()
    )
    anns_by_image: dict[str, list[Annotation]] = {}
    for ann in all_annotations:
        anns_by_image.setdefault(ann.image_id, []).append(ann)

    split_idx = int(len(body.images) * body.split_ratio)
    train_images = body.images[:split_idx]
    val_images = body.images[split_idx:]

    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for subset_name, subset_images in [("train", train_images), ("val", val_images)]:
            for img in subset_images:
                img_anns = anns_by_image.get(img.id, [])

                yolo_lines: list[str] = []
                for ann in img_anns:
                    class_index = class_map.get(ann.class_id)
                    if class_index is None:
                        continue
                    if ann.type not in ("bbox",):
                        continue

                    x_pct = ann.x
                    y_pct = ann.y
                    w_pct = ann.w
                    h_pct = ann.h

                    cx = (x_pct + w_pct / 2.0) / 100.0
                    cy = (y_pct + h_pct / 2.0) / 100.0
                    nw = w_pct / 100.0
                    nh = h_pct / 100.0

                    yolo_lines.append(f"{class_index} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

                label_path = f"labels/{subset_name}/{Path(img.file_name).stem}.txt"
                zf.writestr(label_path, "\n".join(yolo_lines))

                try:
                    safe_url = _validate_image_url(img.file_url)
                    response = httpx.get(safe_url, timeout=30, follow_redirects=True)
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "")
                    if not content_type.startswith("image/"):
                        logger.warning(
                            "Skipped %s: Content-Type is %s (expected image/*)",
                            img.file_name,
                            content_type,
                        )
                        continue
                    img_path = f"images/{subset_name}/{img.file_name}"
                    zf.writestr(img_path, response.content)
                except Exception as exc:
                    logger.warning("Failed to download %s: %s", img.file_name, exc)

        data_yaml = _make_data_yaml(class_names, ".")
        zf.writestr("data.yaml", data_yaml)

    zip_buffer.seek(0)

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="dataset_{body.dataset_id}_yolo.zip"'
        },
    )
