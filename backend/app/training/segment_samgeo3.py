from __future__ import annotations

import hashlib
import logging
import threading
from pathlib import Path
from typing import Any

import httpx
import numpy as np

from app.schemas.segment import Point2D, PolygonOut
from app.training.segment import mask_to_polygons

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CACHE_DIR = BASE_DIR / "cache" / "samgeo3"

_SAMGEO3_INSTANCE: Any = None
_SAMGEO3_LOCK = threading.Lock()


def _get_samgeo3() -> Any:
    global _SAMGEO3_INSTANCE
    if _SAMGEO3_INSTANCE is not None:
        return _SAMGEO3_INSTANCE
    with _SAMGEO3_LOCK:
        if _SAMGEO3_INSTANCE is not None:
            return _SAMGEO3_INSTANCE
        from samgeo import SamGeo3

        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Initializing SamGeo3 on %s ...", device)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        try:
            instance = SamGeo3(backend="meta", device=device)
        except ImportError:
            logger.warning(
                "Meta backend not available, falling back to transformers"
            )
            instance = SamGeo3(backend="transformers", device=device)
        _SAMGEO3_INSTANCE = instance
        return instance


def auto_segment(image: np.ndarray, class_name: str) -> list[PolygonOut]:
    sam = _get_samgeo3()
    sam.set_image(image)
    sam.generate_masks(class_name, quiet=True)

    height, width = image.shape[:2]
    polygons: list[PolygonOut] = []

    masks = getattr(sam, "masks", []) or []
    for mask in masks:
        if hasattr(mask, "cpu"):
            mask_np = mask.cpu().numpy().astype(np.uint8)
        elif hasattr(mask, "numpy"):
            mask_np = mask.numpy().astype(np.uint8)
        else:
            mask_np = np.asarray(mask, dtype=np.uint8)

        if mask_np.ndim == 3:
            mask_np = mask_np.squeeze()

        raw_polys = mask_to_polygons(mask_np)
        for poly in raw_polys:
            normalized = [
                Point2D(
                    x=round(p[0] / width * 100, 2),
                    y=round(p[1] / height * 100, 2),
                )
                for p in poly
            ]
            polygons.append(PolygonOut(points=normalized))

    return polygons


def _download_to_cache(url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256(url.encode()).hexdigest()[:16]
    cache_path = CACHE_DIR / f"{key}.tif"

    if cache_path.exists():
        return cache_path

    from app.utils.download import extract_drive_id
    from app.utils.google_drive_auth import get_drive_access_token

    file_id = extract_drive_id(url)
    with httpx.Client(timeout=300, follow_redirects=True) as client:
        if file_id:
            access_token = get_drive_access_token()
            drive_url = (
                f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
            )
            response = client.get(
                drive_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
        else:
            response = client.get(url)
        response.raise_for_status()
        cache_path.write_bytes(response.content)

    return cache_path


def segment_tiled(
    source_url: str,
    class_name: str,
    output: str | None = None,
    tile_size: int = 1024,
    overlap: int = 128,
    min_size: int = 0,
    vector_output: str | None = None,
) -> dict[str, Any]:
    sam = _get_samgeo3()

    source_path = _download_to_cache(source_url)

    if output is None:
        stem = source_path.stem
        output = str(CACHE_DIR / f"{stem}_mask.tif")

    sam.generate_masks_tiled(
        source=str(source_path),
        prompt=class_name,
        output=output,
        tile_size=tile_size,
        overlap=overlap,
        min_size=min_size,
        unique=True,
    )

    import tifffile

    with tifffile.TiffFile(output) as tif:
        data = tif.asarray()
        num_objects = int(data.max())

    result: dict[str, Any] = {
        "output_path": output,
        "vector_path": None,
        "num_objects": num_objects,
    }

    if vector_output:
        sam.raster_to_vector(output, vector_output)
        result["vector_path"] = vector_output

    return result
