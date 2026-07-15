from __future__ import annotations

import json
import math
import os
import tempfile
import time
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.utils.download import extract_drive_id

TILE_SIZE = 512
MAX_RENDER_SIZE = 4096


class TileInfo:
    __slots__ = (
        "tile_name", "x", "y", "w", "h",
        "img_width", "img_height", "original_image_id",
    )

    def __init__(
        self,
        tile_name: str,
        x: int, y: int, w: int, h: int,
        img_width: int, img_height: int,
        original_image_id: str,
    ) -> None:
        self.tile_name = tile_name
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.img_width = img_width
        self.img_height = img_height
        self.original_image_id = original_image_id


def is_cog_file(file_name: str) -> bool:
    ext = Path(file_name).suffix.lower()
    return ext in (".tif", ".tiff")


def _download_cog_http(file_url: str, dest: Path) -> None:
    import httpx
    CHUNK_SIZE = 256 * 1024
    with httpx.Client(timeout=600, follow_redirects=True) as client:
        with client.stream("GET", file_url) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_bytes(CHUNK_SIZE):
                    f.write(chunk)


def _download_cog_drive(file_id: str, dest: Path) -> None:
    import httpx
    from app.utils.google_service_account import get_auth_headers
    drive_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
    headers = get_auth_headers()
    CHUNK_SIZE = 256 * 1024
    with httpx.Client(timeout=600) as client:
        with client.stream("GET", drive_url, headers=headers) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_bytes(CHUNK_SIZE):
                    f.write(chunk)


def download_cog(file_url: str, dest: Path) -> None:
    file_id = extract_drive_id(file_url)
    if file_id:
        _download_cog_drive(file_id, dest)
    else:
        _download_cog_http(file_url, dest)


def render_cog_to_rgb(
    cog_path: Path,
    output_path: Path,
    max_size: int = MAX_RENDER_SIZE,
) -> tuple[int, int]:
    import tifffile
    with tifffile.TiffFile(cog_path) as tif:
        data = tif.asarray()
    if data is None:
        raise ValueError(f"Failed to read TIFF data from {cog_path}")
    if data.ndim == 3:
        c, h, w = data.shape
        if c <= 4 and h > c and w > c:
            rgb_data = np.transpose(data[:3], (1, 2, 0))
        else:
            rgb_data = data[..., :3] if data.shape[-1] >= 3 else np.stack([data[..., 0]] * 3, axis=-1)
    elif data.ndim == 2:
        h, w = data.shape
        rgb_data = np.stack([data, data, data], axis=-1)
    else:
        raise ValueError(f"Unexpected data shape: {data.ndim}D {data.shape}")

    h, w = rgb_data.shape[:2]
    scale = min(1.0, max_size / max(h, w, 1))
    if scale < 1.0:
        new_h = max(1, round(h * scale))
        new_w = max(1, round(w * scale))
        result = np.zeros((new_h, new_w, 3), dtype=np.uint8)
        for c_i in range(3):
            channel = rgb_data[..., c_i].astype(np.float64)
            lo, hi = float(channel.min()), float(channel.max())
            if hi - lo > 1e-10:
                channel = np.clip((channel - lo) / (hi - lo) * 255, 0, 255)
            else:
                channel = np.zeros_like(channel)
            img_c = Image.fromarray(channel.astype(np.uint8))
            img_c = img_c.resize((new_w, new_h), Image.LANCZOS)
            result[..., c_i] = np.array(img_c)
        h, w = new_h, new_w
    else:
        result = np.zeros((h, w, 3), dtype=np.uint8)
        for c_i in range(3):
            channel = rgb_data[..., c_i].astype(np.float64)
            lo, hi = float(channel.min()), float(channel.max())
            if hi - lo > 1e-10:
                channel = np.clip((channel - lo) / (hi - lo) * 255, 0, 255)
            else:
                channel = np.zeros_like(channel)
            result[..., c_i] = np.clip(channel, 0, 255).astype(np.uint8)
    img = Image.fromarray(result, "RGB")
    img.save(output_path, format="PNG")
    return w, h


def tile_image(
    image_path: Path,
    output_dir: Path,
    tile_size: int = TILE_SIZE,
) -> list[TileInfo]:
    img = Image.open(image_path)
    img_w, img_h = img.size
    tiles: list[TileInfo] = []
    tile_idx = 0
    stride = tile_size
    for y in range(0, img_h, stride):
        for x in range(0, img_w, stride):
            tw = min(tile_size, img_w - x)
            th = min(tile_size, img_h - y)
            if tw < tile_size * 0.25 or th < tile_size * 0.25:
                continue
            tile = img.crop((x, y, x + tw, y + th))
            tile_name = f"tile_{tile_idx:04d}_{x}_{y}_{tw}_{th}.png"
            tile.save(str(output_dir / tile_name))
            tiles.append(TileInfo(
                tile_name=tile_name,
                x=x, y=y, w=tw, h=th,
                img_width=img_w, img_height=img_h,
                original_image_id="",
            ))
            tile_idx += 1
    return tiles


def remap_annotations_to_tile_yolo(
    annotations: list[Any],
    tile: TileInfo,
    class_map: dict[str, int],
) -> list[str]:
    tx, ty = tile.x, tile.y
    tw, th = tile.w, tile.h
    img_w, img_h = tile.img_width, tile.img_height
    lines: list[str] = []
    for ann in annotations:
        cls_idx = class_map.get(ann.class_id)
        if cls_idx is None or ann.type != "bbox":
            continue
        ax = ann.x / 100.0 * img_w
        ay = ann.y / 100.0 * img_h
        aw = ann.w / 100.0 * img_w
        ah = ann.h / 100.0 * img_h
        bbox_left = ax
        bbox_top = ay
        bbox_right = ax + aw
        bbox_bottom = ay + ah
        tile_left, tile_right = tx, tx + tw
        tile_top, tile_bottom = ty, ty + th
        overlap_left = max(bbox_left, tile_left)
        overlap_top = max(bbox_top, tile_top)
        overlap_right = min(bbox_right, tile_right)
        overlap_bottom = min(bbox_bottom, tile_bottom)
        if overlap_left >= overlap_right or overlap_top >= overlap_bottom:
            continue
        overlap_area = (overlap_right - overlap_left) * (overlap_bottom - overlap_top)
        bbox_area = aw * ah
        if bbox_area > 0 and overlap_area / bbox_area < 0.25:
            continue
        local_left = max(0, overlap_left - tx)
        local_top = max(0, overlap_top - ty)
        local_right = min(tw, overlap_right - tx)
        local_bottom = min(th, overlap_bottom - ty)
        local_cx = (local_left + local_right) / 2.0
        local_cy = (local_top + local_bottom) / 2.0
        local_nw = local_right - local_left
        local_nh = local_bottom - local_top
        cx_norm = local_cx / tw
        cy_norm = local_cy / th
        nw_norm = local_nw / tw
        nh_norm = local_nh / th
        lines.append(f"{cls_idx} {cx_norm:.6f} {cy_norm:.6f} {nw_norm:.6f} {nh_norm:.6f}")
    return lines


def remap_polygon_to_tile_mask(
    annotations: list[Any],
    tile: TileInfo,
    tile_mask_path: Path,
) -> bool:
    import cv2
    tx, ty = tile.x, tile.y
    tw, th = tile.w, tile.h
    img_w, img_h = tile.img_width, tile.img_height
    mask = np.zeros((th, tw), dtype=np.uint8)
    any_polygon = False
    for ann in annotations:
        if ann.type != "polygon":
            continue
        points_raw = json.loads(ann.points) if ann.points else []
        if not points_raw:
            continue
        pts = np.array(
            [
                [int(p["x"] / 100.0 * img_w - tx), int(p["y"] / 100.0 * img_h - ty)]
                for p in points_raw
            ],
            dtype=np.int32,
        )
        if pts.size == 0:
            continue
        cv2.fillPoly(mask, [pts], 1)
        any_polygon = True
    if not any_polygon:
        return False
    import pycocotools.mask as mask_utils
    rle = mask_utils.encode(np.asfortranarray(mask))
    rle["counts"] = rle["counts"].decode("utf-8")
    tile_mask_path.write_text(json.dumps(rle), encoding="utf-8")
    return True


def prepare_cog_dataset(
    images: list[dict[str, Any]],
    anns_by_image: dict[str, list[Any]],
    work_dir: Path,
    class_map: dict[str, int],
    ann_type: str = "bbox",
) -> tuple[list[dict[str, Any]], dict[str, list[Any]]]:
    expanded_images: list[dict[str, Any]] = []
    expanded_anns: dict[str, list[Any]] = {}
    cog_tiles_dir = work_dir / "cog_tiles"
    cog_tiles_dir.mkdir(parents=True, exist_ok=True)
    processed_original_ids: set[str] = set()
    for img in images:
        file_name = img.get("file_name", "")
        if not is_cog_file(file_name):
            expanded_images.append(img)
            iid = img["id"]
            if iid in anns_by_image:
                expanded_anns[iid] = anns_by_image[iid]
            continue
        iid = img["id"]
        if iid in processed_original_ids:
            continue
        processed_original_ids.add(iid)
        img_anns = anns_by_image.get(iid, [])
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        safe_name = Path(file_name).stem.replace(".", "_")
        cog_local = cog_tiles_dir / f"{safe_name}_{timestamp}.tif"
        try:
            download_cog(img["file_url"], cog_local)
        except Exception as exc:
            print(f"Warning: failed to download COG {file_name}: {exc}")
            continue
        rendered_png = cog_tiles_dir / f"{safe_name}_{timestamp}.png"
        try:
            render_cog_to_rgb(cog_local, rendered_png)
        except Exception as exc:
            print(f"Warning: failed to render COG {file_name}: {exc}")
            cog_local.unlink(missing_ok=True)
            continue
        tiles = tile_image(rendered_png, cog_tiles_dir)
        for tile in tiles:
            tile.original_image_id = iid
            tile_id = f"{iid}_tile_{tile.x}_{tile.y}"
            expanded_images.append({
                "id": tile_id,
                "file_name": tile.tile_name,
                "file_url": "",  # tiles are local files
                "width": tile.w,
                "height": tile.h,
                "_tile_info": tile,
                "_is_cog_tile": True,
            })
            if ann_type == "bbox":
                label_lines = remap_annotations_to_tile_yolo(img_anns, tile, class_map)
                if label_lines:
                    expanded_anns[tile_id] = label_lines
                else:
                    expanded_anns[tile_id] = []
            else:
                tile_mask_path = cog_tiles_dir / f"{tile.tile_name}.mask.json"
                has_mask = remap_polygon_to_tile_mask(img_anns, tile, tile_mask_path)
                if has_mask:
                    expanded_anns[tile_id] = [tile_mask_path]
                else:
                    expanded_anns[tile_id] = []
        cog_local.unlink(missing_ok=True)
    return expanded_images, expanded_anns


def prepare_cog_dataset_sam(
    images: list[dict[str, Any]],
    anns_by_image: dict[str, list[Any]],
    work_dir: Path,
) -> tuple[list[dict[str, Any]], dict[str, list[Any]]]:
    import cv2
    expanded_images: list[dict[str, Any]] = []
    expanded_masks: dict[str, Any] = {}
    cog_tiles_dir = work_dir / "cog_tiles"
    cog_tiles_dir.mkdir(parents=True, exist_ok=True)
    processed_original_ids: set[str] = set()
    for img in images:
        file_name = img.get("file_name", "")
        if not is_cog_file(file_name):
            expanded_images.append(img)
            continue
        iid = img["id"]
        if iid in processed_original_ids:
            continue
        processed_original_ids.add(iid)
        img_anns = anns_by_image.get(iid, [])
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        safe_name = Path(file_name).stem.replace(".", "_")
        cog_local = cog_tiles_dir / f"{safe_name}_{timestamp}.tif"
        try:
            download_cog(img["file_url"], cog_local)
        except Exception as exc:
            print(f"Warning: failed to download COG {file_name}: {exc}")
            continue
        rendered_png = cog_tiles_dir / f"{safe_name}_{timestamp}.png"
        try:
            render_cog_to_rgb(cog_local, rendered_png)
        except Exception as exc:
            print(f"Warning: failed to render COG {file_name}: {exc}")
            cog_local.unlink(missing_ok=True)
            continue
        tiles = tile_image(rendered_png, cog_tiles_dir)
        for tile in tiles:
            tile.original_image_id = iid
            tile_id = f"{iid}_tile_{tile.x}_{tile.y}"
            expanded_images.append({
                "id": tile_id,
                "file_name": tile.tile_name,
                "file_url": "",
                "width": tile.w,
                "height": tile.h,
                "_tile_info": tile,
                "_is_cog_tile": True,
            })
            mask_data = _create_tile_mask_from_polygons(img_anns, tile)
            if mask_data is not None:
                expanded_masks[tile_id] = mask_data
        cog_local.unlink(missing_ok=True)
    return expanded_images, expanded_masks


def _create_tile_mask_from_polygons(
    annotations: list[Any],
    tile: TileInfo,
) -> dict[str, Any] | None:
    import cv2
    import pycocotools.mask as mask_utils
    tx, ty = tile.x, tile.y
    tw, th = tile.w, tile.h
    img_w, img_h = tile.img_width, tile.img_height
    mask = np.zeros((th, tw), dtype=np.uint8)
    any_polygon = False
    for ann in annotations:
        if ann.type != "polygon":
            continue
        points_raw = json.loads(ann.points) if ann.points else []
        if not points_raw:
            continue
        pts = np.array(
            [
                [int(p["x"] / 100.0 * img_w - tx), int(p["y"] / 100.0 * img_h - ty)]
                for p in points_raw
            ],
            dtype=np.int32,
        )
        if pts.size == 0:
            continue
        cv2.fillPoly(mask, [pts], 1)
        any_polygon = True
    if not any_polygon:
        return None
    rle = mask_utils.encode(np.asfortranarray(mask))
    rle["counts"] = rle["counts"].decode("utf-8")
    bbox = _mask_to_bbox(mask)
    class _MaskProxy:
        __slots__ = ("mask_data", "bbox_prompt")
        def __init__(self, mask_data: str, bbox_prompt: str) -> None:
            self.mask_data = mask_data
            self.bbox_prompt = bbox_prompt
    return _MaskProxy(
        mask_data=json.dumps(rle),
        bbox_prompt=json.dumps(bbox),
    )


def _mask_to_bbox(mask: np.ndarray) -> list[int]:
    y_idx, x_idx = np.where(mask == 1)
    if len(x_idx) == 0 or len(y_idx) == 0:
        return [0, 0, 0, 0]
    return [
        int(np.min(x_idx)),
        int(np.min(y_idx)),
        int(np.max(x_idx)),
        int(np.max(y_idx)),
    ]
