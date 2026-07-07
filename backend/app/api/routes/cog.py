from __future__ import annotations

import hashlib
import io
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Optional

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from PIL import Image
import tifffile

router = APIRouter()

CACHE_DIR = Path(__file__).parent.parent.parent.parent / "cache" / "cog"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

MAX_CACHE_MB = 2048

# ---- palette helpers (mirrors frontend colormaps.ts) ----


def _interpolate_stops(
    stops: list[tuple[float, int, int, int]], size: int = 256
) -> np.ndarray:
    lut = np.zeros((size, 3), dtype=np.uint8)
    for i in range(size):
        t = i / (size - 1)
        for j in range(len(stops) - 1):
            lo = stops[j]
            hi = stops[j + 1]
            if lo[0] <= t <= hi[0]:
                span = hi[0] - lo[0]
                f = 0 if span == 0 else (t - lo[0]) / span
                lut[i] = [
                    round(lo[1] + (hi[1] - lo[1]) * f),
                    round(lo[2] + (hi[2] - lo[2]) * f),
                    round(lo[3] + (hi[3] - lo[3]) * f),
                ]
                break
    return lut


PALETTES: dict[str, np.ndarray] = {
    "grayscale": _interpolate_stops([(0, 0, 0, 0), (1, 255, 255, 255)]),
    "jet": _interpolate_stops([
        (0, 0, 0, 128), (0.125, 0, 0, 255), (0.375, 0, 255, 255),
        (0.625, 255, 255, 0), (0.875, 255, 0, 0), (1, 128, 0, 0),
    ]),
    "hot": _interpolate_stops([
        (0, 0, 0, 0), (0.33, 255, 0, 0), (0.66, 255, 255, 0),
        (1, 255, 255, 255),
    ]),
    "coolwarm": _interpolate_stops([
        (0, 59, 76, 192), (0.5, 255, 255, 255), (1, 180, 4, 38),
    ]),
    "viridis": _interpolate_stops([
        (0, 68, 1, 84), (0.1, 72, 23, 105), (0.2, 66, 47, 107),
        (0.3, 51, 70, 99), (0.4, 38, 90, 86), (0.5, 32, 108, 71),
        (0.6, 38, 126, 54), (0.7, 66, 144, 34), (0.8, 118, 162, 14),
        (0.9, 178, 176, 7), (1, 253, 231, 37),
    ]),
    "plasma": _interpolate_stops([
        (0, 13, 8, 135), (0.1, 58, 8, 149), (0.2, 94, 14, 148),
        (0.3, 128, 27, 134), (0.4, 159, 44, 112), (0.5, 187, 64, 85),
        (0.6, 211, 88, 57), (0.7, 232, 115, 30), (0.8, 248, 148, 13),
        (0.9, 253, 187, 38), (1, 240, 249, 33),
    ]),
    "inferno": _interpolate_stops([
        (0, 0, 0, 4), (0.1, 21, 8, 59), (0.2, 57, 11, 100),
        (0.3, 94, 19, 115), (0.4, 131, 32, 109), (0.5, 167, 49, 87),
        (0.6, 198, 70, 58), (0.7, 221, 98, 32), (0.8, 237, 132, 16),
        (0.9, 246, 171, 42), (1, 252, 253, 164),
    ]),
    "turbo": _interpolate_stops([
        (0, 48, 18, 59), (0.1, 23, 68, 136), (0.2, 10, 118, 178),
        (0.3, 13, 165, 179), (0.4, 42, 207, 143), (0.5, 100, 236, 87),
        (0.6, 174, 244, 42), (0.7, 227, 226, 30), (0.8, 248, 181, 29),
        (0.9, 249, 122, 35), (1, 236, 63, 44),
    ]),
}

LANCZOS = Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS  # type: ignore[attr-defined]


def _evict_cache_if_needed() -> None:
    total = sum(f.stat().st_size for f in CACHE_DIR.iterdir() if f.is_file())
    if total > MAX_CACHE_MB * 1024 * 1024:
        files = sorted(
            CACHE_DIR.iterdir(), key=lambda f: f.stat().st_mtime
        )
        for f in files[:-10]:
            f.unlink()


def _cache_path(url: str) -> Path:
    key = hashlib.sha256(url.encode()).hexdigest()[:16]
    return CACHE_DIR / f"{key}.tif"


async def _ensure_cached(url: str) -> Path:
    cache_path = _cache_path(url)
    if cache_path.exists():
        return cache_path
    async with httpx.AsyncClient(follow_redirects=True, timeout=300) as client:
        response = await client.get(url)
        response.raise_for_status()
        _evict_cache_if_needed()
        cache_path.write_bytes(response.content)
    return cache_path


def _read_band(
    cache_path: Path, band: int
) -> tuple[np.ndarray, int, int]:
    with tifffile.TiffFile(cache_path) as tif:
        series = tif.series[0]
        if hasattr(series, "pages") and series.pages:
            page_idx = min(band, len(series.pages) - 1)
            page_raw = series.pages[page_idx]
        else:
            page_idx = min(band, len(tif.pages) - 1)
            page_raw = tif.pages[page_idx]
        if page_raw is None:
            raise ValueError(f"Page {page_idx} not found in {cache_path}")
        data = page_raw.asarray()
        if data is None:
            raise ValueError(f"Failed to read band {band} from {cache_path}")
        h, w = data.shape[:2]
        return data.astype(np.float64), w, h


def _apply_palette(
    band_data: np.ndarray,
    palette_name: str,
    min_val: float,
    max_val: float,
) -> bytes:
    palette = PALETTES.get(palette_name, PALETTES["grayscale"])
    if max_val - min_val < 1e-10:
        max_val = min_val + 1.0
    normalized = np.clip(
        (band_data - min_val) / (max_val - min_val) * 255, 0, 255
    ).astype(np.uint8)
    rgb = palette[normalized]
    h, w = rgb.shape[:2]
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb
    rgba[:, :, 3] = 255
    img = Image.fromarray(rgba, "RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _ensure_dir(path: str) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


# ---- endpoints ----


@router.get("/cog/info")
async def cog_info(url: str = Query(...)) -> dict[str, Any]:
    cache_path = await _ensure_cached(url)
    with tifffile.TiffFile(cache_path) as tif:
        series = tif.series[0]
        if hasattr(series, "pages") and series.pages:
            band_count = len(series.pages)
            page0 = series.pages[0]
        else:
            band_count = len(tif.pages)
            page0 = tif.pages[0]
        if page0 is None:
            raise HTTPException(500, "Failed to read first page")
        data = page0.asarray()
        if data is None:
            raise HTTPException(500, "Failed to read pixel data")
        img_w = (
            page0.imagewidth
            if hasattr(page0, "imagewidth")
            else data.shape[1]
        )
        img_h = (
            page0.imagelength
            if hasattr(page0, "imagelength")
            else data.shape[0]
        )
        return {
            "width": int(img_w),
            "height": int(img_h),
            "band_count": band_count,
            "min": float(data.min()),
            "max": float(data.max()),
        }


@router.get("/cog/render")
async def cog_render(
    url: str = Query(...),
    band: int = Query(0),
    palette: str = Query("grayscale"),
    min_val: Optional[float] = Query(None, alias="min"),
    max_val: Optional[float] = Query(None, alias="max"),
    max_width: int = Query(2048),
    max_height: int = Query(2048),
) -> Response:
    cache_path = await _ensure_cached(url)
    band_data, orig_w, orig_h = _read_band(cache_path, band)
    scale_factor = min(1.0, max_width / orig_w, max_height / orig_h)
    w = max(1, round(orig_w * scale_factor))
    h = max(1, round(orig_h * scale_factor))
    if scale_factor < 1.0:
        img_pil = Image.fromarray(band_data.astype(np.float32))
        img_pil = img_pil.resize((w, h), LANCZOS)
        band_data = np.array(img_pil, dtype=np.float64)
    actual_min = min_val if min_val is not None else float(band_data.min())
    actual_max = max_val if max_val is not None else float(band_data.max())
    png_bytes = _apply_palette(band_data, palette, actual_min, actual_max)
    return Response(png_bytes, media_type="image/png")


@router.get("/cog/tile/{z}/{x}/{y}.png")
async def cog_tile(
    z: int,
    x: int,
    y: int,
    url: str = Query(...),
    band: int = Query(0),
    palette: str = Query("grayscale"),
    min_val: Optional[float] = Query(None, alias="min"),
    max_val: Optional[float] = Query(None, alias="max"),
) -> Response:
    cache_path = await _ensure_cached(url)
    band_data, orig_w, orig_h = _read_band(cache_path, band)
    tiles_at_z = 2**z
    tile_w = max(1, orig_w // tiles_at_z)
    tile_h = max(1, orig_h // tiles_at_z)
    x_start = x * tile_w
    y_start = y * tile_h
    x_end = min(orig_w, x_start + tile_w)
    y_end = min(orig_h, y_start + tile_h)
    if x_start >= orig_w or y_start >= orig_h:
        img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return Response(buf.getvalue(), media_type="image/png")
    tile_data = band_data[y_start:y_end, x_start:x_end]
    actual_min = min_val if min_val is not None else float(band_data.min())
    actual_max = max_val if max_val is not None else float(band_data.max())
    rgb_tile = PALETTES.get(palette, PALETTES["grayscale"])[
        np.clip(
            (tile_data - actual_min) / (actual_max - actual_min) * 255,
            0,
            255,
        ).astype(np.uint8)
    ]
    rgba_tile = np.zeros(
        (rgb_tile.shape[0], rgb_tile.shape[1], 4), dtype=np.uint8
    )
    rgba_tile[:, :, :3] = rgb_tile
    rgba_tile[:, :, 3] = 255
    tile_img = Image.fromarray(rgba_tile, "RGBA")
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.paste(tile_img, (0, 0))
    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    return Response(buf.getvalue(), media_type="image/png")


@router.post("/cog/convert", status_code=201)
async def cog_convert(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.filename is None:
        raise HTTPException(400, "No filename provided")
    tmp = tempfile.NamedTemporaryFile(suffix=".tif", delete=False)
    try:
        content = await file.read()
        tmp.write(content)
        tmp.close()
        cog_path = tmp.name.replace(".tif", "_cog.tif")
        with tifffile.TiffFile(tmp.name) as tif:
            data = tif.asarray()
            if data is None:
                raise ValueError("Failed to read TIFF data")
            if data.ndim == 2:
                data = data[np.newaxis, :, :]
        with tifffile.TiffWriter(cog_path, bigtiff=True) as writer:
            for i in range(data.shape[0]):
                writer.write(
                    data[i],
                    compression="deflate",
                    tile=(256, 256),
                    metadata={"band": i},
                )
        output_dir = _ensure_dir(
            os.path.join(
                os.path.dirname(__file__), "..", "..", "..", "converted"
            )
        )
        filename_hash = hashlib.sha256(
            file.filename.encode()
        ).hexdigest()[:16]
        output_path = output_dir / f"{filename_hash}.tif"
        shutil.move(cog_path, output_path)
        return {
            "url": str(output_path),
            "filename": file.filename,
            "status": "converted",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"COG conversion failed: {e}"
        )
    finally:
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)
        if os.path.exists(tmp.name.replace(".tif", "_cog.tif")):
            os.unlink(tmp.name.replace(".tif", "_cog.tif"))
