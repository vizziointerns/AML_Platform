from __future__ import annotations

import asyncio
import hashlib
import io
import math
import os
import re
import shutil
import tempfile
import threading
from pathlib import Path
from typing import Any, Optional, cast

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from PIL import Image
import tifffile

from app.utils.download import extract_drive_id
from app.utils.google_drive_auth import async_get_drive_access_token

router = APIRouter()

DRIVE_FILES_API = "https://www.googleapis.com/drive/v3/files"

_ALLOWED_DOWNLOAD_HOSTS: set[str] = {
    "drive.google.com",
    "docs.google.com",
    "googleapis.com",
    "lh3.googleusercontent.com",
    "ssl.gstatic.com",
    "supabase.co",
}


def _assert_allowed_url(url: str) -> None:
    """Reject URLs that could enable SSRF.

    Only allows Google-hosted endpoints and rejects private/local IPs.
    cache:// URLs are exempt — they refer to local pre-cached files.
    """
    if url.startswith("cache://"):
        return
    from urllib.parse import urlparse
    import ipaddress

    parsed = urlparse(url)
    if parsed.scheme not in ("https",):
        raise ValueError(f"Only HTTPS URLs are allowed: {url}")
    host = parsed.hostname
    if not host:
        raise ValueError(f"Could not parse host from URL: {url}")
    if not any(host == allowed or host.endswith("." + allowed) for allowed in _ALLOWED_DOWNLOAD_HOSTS):
        raise ValueError(f"URL host not in allowed list: {host}")
    import socket

    try:
        addr_info = socket.getaddrinfo(host, 443)
    except Exception as exc:
        raise ValueError(f"Could not resolve host: {host}") from exc
    for _family, _type, _proto, _canonname, sockaddr in addr_info:
        ip: str = cast(str, sockaddr[0])
        addr = ipaddress.ip_address(ip)
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_unspecified:
            raise ValueError(f"Resolved to private IP, rejected: {ip}")


CACHE_DIR = Path(__file__).parent.parent.parent.parent / "cache" / "cog"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

MAX_CACHE_MB = 2048

_download_locks: dict[str, asyncio.Event] = {}
_download_locks_lock = threading.Lock()

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

# ---- in-memory band cache ----

_band_cache: dict[tuple[str, int], tuple[np.ndarray, int, int, float, float]] = {}
_band_cache_lock = threading.Lock()
_meta_cache: dict[str, tuple[int, int, int, bool]] = {}
_meta_cache_lock = threading.Lock()


def _infer_page_structure(
    cache_path: Path,
) -> tuple[int, int, int, bool]:
    """Return ``(num_pages, full_w, full_h, is_pyramid)``.

    ``is_pyramid`` is ``True`` when successive pages have decreasing
    dimensions (multi-resolution TIFF).  When ``False``, each page is a
    separate band and we must map ``band`` to the page index directly.
    """
    cache_key = str(cache_path)
    with _meta_cache_lock:
        if cache_key in _meta_cache:
            return _meta_cache[cache_key]

    with tifffile.TiffFile(cache_path) as tif:
        num_pages = len(tif.pages)
        if num_pages == 0:
            raise ValueError(f"No pages found in {cache_path}")
        p0 = tif.pages[0]
        full_w = int(p0.imagewidth)  # type: ignore[union-attr]
        full_h = int(p0.imagelength)  # type: ignore[union-attr]
        if num_pages > 1:
            p1 = tif.pages[1]
            p1_w = int(p1.imagewidth)  # type: ignore[union-attr]
            p1_h = int(p1.imagelength)  # type: ignore[union-attr]
            is_pyramid = p1_w < full_w or p1_h < full_h
        else:
            is_pyramid = False

    with _meta_cache_lock:
        _meta_cache[cache_key] = (num_pages, full_w, full_h, is_pyramid)
    return num_pages, full_w, full_h, is_pyramid


def _read_band_page(
    cache_path: Path, page_idx: int = 0
) -> tuple[np.ndarray, int, int, float, float]:
    """Read a single-channel array from a given page index, cached in memory.

    Returns ``(data, width, height, data_min, data_max)``.
    """
    key = (str(cache_path), page_idx)
    with _band_cache_lock:
        cached = _band_cache.get(key)
        if cached is not None:
            return cached

    with tifffile.TiffFile(cache_path) as tif:
        raw_page = tif.pages[page_idx]
        if raw_page is None:
            raise ValueError(f"Page {page_idx} not found in {cache_path}")
        data = raw_page.asarray()
        if data is None:
            raise ValueError(f"Failed to read page {page_idx} from {cache_path}")
        if data.ndim > 2:
            data = data[..., 0]
        h, w = data.shape[:2]

    data_min = float(data.min())
    data_max = float(data.max())

    with _band_cache_lock:
        if len(_band_cache) >= 6:
            oldest = next(iter(_band_cache))
            del _band_cache[oldest]
        _band_cache[key] = (data, w, h, data_min, data_max)

    return data, w, h, data_min, data_max


def _pick_overview_page(
    num_pages: int, image_max_dim: int, z: int
) -> int:
    """Select the best overview page index for a given tile z-level.

    The image divides into ``2**z`` tiles per axis.  We pick the overview
    where the tile region in overview coordinates is closest to ~256 px,
    so we minimise the final resize cost.
    """
    if num_pages <= 1:
        return 0
    target_log2 = math.log2(image_max_dim) - 8  # log2(W / 256)
    best = round(target_log2 - z)
    return max(0, min(num_pages - 1, best))


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
    # cache:// URLs point to files already on disk — no download needed
    if url.startswith("cache://"):
        hash_part = url.removeprefix("cache://")
        if hash_part.endswith(".tif"):
            hash_part = hash_part[:-4]
        elif hash_part.endswith(".bin"):
            hash_part = hash_part[:-4]
        # Validate: must be a 16-char hex string (no path traversal)
        if not re.fullmatch(r"[0-9a-f]{16}", hash_part):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid cache ID: {hash_part}",
            )
        cached = CACHE_DIR / f"{hash_part}.tif"
        if cached.exists():
            return cached
        cached = CACHE_DIR / f"{hash_part}.bin"
        if cached.exists():
            return cached
        raise HTTPException(status_code=404, detail=f"Cached file not found: {url}")

    cache_path = _cache_path(url)
    if cache_path.exists():
        return cache_path

    # Prevent concurrent downloads of the same URL
    # Must not await while holding the threading lock
    cache_key = str(cache_path)
    with _download_locks_lock:
        existing = _download_locks.get(cache_key)

    if existing is not None:
        await existing.wait()
        if cache_path.exists():
            return cache_path
        # Downloader failed — proceed to re-download
        with _download_locks_lock:
            _download_locks.pop(cache_key, None)

    with _download_locks_lock:
        event = asyncio.Event()
        _download_locks[cache_key] = event

    try:
        _assert_allowed_url(url)

        async with httpx.AsyncClient(follow_redirects=False, timeout=300) as client:
            file_id = extract_drive_id(url)
            if file_id:
                access_token = await async_get_drive_access_token()
                drive_url = f"{DRIVE_FILES_API}/{file_id}?alt=media"
                response = await client.get(
                    drive_url,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
            else:
                response = await client.get(url)
            response.raise_for_status()
            _evict_cache_if_needed()
            cache_path.write_bytes(response.content)
    finally:
        with _download_locks_lock:
            _download_locks.pop(cache_key, None)
        event.set()

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
        if data.ndim > 2:
            data = data[..., 0]
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
        resize_data = band_data[..., 0] if band_data.ndim > 2 else band_data
        img_pil = Image.fromarray(resize_data.astype(np.float32))
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

    num_pages, full_w, full_h, is_pyramid = _infer_page_structure(cache_path)
    if is_pyramid:
        page_idx = _pick_overview_page(num_pages, max(full_w, full_h), z)
    else:
        page_idx = min(band, num_pages - 1)
    band_data, orig_w, orig_h, band_min, band_max = _read_band_page(cache_path, page_idx)

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
    actual_min = min_val if min_val is not None else band_min
    actual_max = max_val if max_val is not None else band_max
    if actual_max - actual_min < 1e-10:
        actual_max = actual_min + 1.0
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
    tile_img = Image.fromarray(rgba_tile, "RGBA").resize((256, 256), LANCZOS)
    buf = io.BytesIO()
    tile_img.save(buf, format="PNG")
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
        content_hash = hashlib.sha256(content).hexdigest()[:16]
        output_filename = f"{content_hash}.tif"
        output_dir = _ensure_dir(
            os.path.join(
                os.path.dirname(__file__), "..", "..", "..", "converted"
            )
        )
        output_path = output_dir / output_filename
        shutil.move(cog_path, output_path)
        serve_url = f"/api/cog/files/{output_filename}"
        return {
            "url": serve_url,
            "filename": file.filename,
            "status": "converted",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"COG conversion failed: {e}"
        ) from e
    finally:
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)
        if os.path.exists(tmp.name.replace(".tif", "_cog.tif")):
            os.unlink(tmp.name.replace(".tif", "_cog.tif"))


@router.get("/cog/files/{filename}")
async def serve_converted_file(filename: str) -> Response:
    output_dir = _ensure_dir(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "converted")
    )
    file_path = output_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    content = file_path.read_bytes()
    return Response(content, media_type="image/tiff")
