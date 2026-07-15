import glob
import hashlib
import json
import os
import random
import shutil
import tempfile
import threading
import time
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sqlalchemy import inspect, Table, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import SessionLocal
from app.models.training import TrainingRun
from app.models.segmentation import SegmentationMask
from app.models.annotation import Annotation
from app.training.cog_utils import (
    is_cog_file,
    prepare_cog_dataset_sam,
)
from app.training.trainer import (
    TrainingConfig,
    MODELS_DIR,
    _update_run,
    _cancelled_runs,
)
from app.training.sam_loader import load_sam_model
from app.training.trainer_yolo import _download_image

try:
    from segment_anything.utils.transforms import ResizeLongestSide
except ImportError:
    ResizeLongestSide = None

cache_lock = threading.Lock()
sam_training_lock = threading.Lock()


def rle_to_mask(rle_dict: dict[str, Any]) -> Any:
    counts = rle_dict["counts"]
    h, w = rle_dict["size"]

    if isinstance(counts, str):
        try:
            import importlib

            mask_utils = importlib.import_module("pycocotools.mask")
            m = getattr(mask_utils, "decode")(rle_dict)
            return m
        except ImportError:
            raise RuntimeError("pycocotools is required for compressed string RLEs")

    flat = np.zeros(h * w, dtype=np.uint8)
    idx = 0
    val = 0
    for count in counts:
        flat[idx : idx + count] = val
        idx += count
        val = 1 - val

    return flat.reshape((w, h)).T


def mask_to_rle(mask: np.ndarray) -> dict[str, Any]:
    try:
        import pycocotools.mask as maskUtils

        rle = maskUtils.encode(np.asfortranarray(mask))
        rle["counts"] = rle["counts"].decode("utf-8")
        return dict(rle)
    except ImportError:
        return {"size": list(mask.shape), "counts": ""}


def dice_loss(
    pred_logits: torch.Tensor, target: torch.Tensor, eps: float = 1e-6
) -> torch.Tensor:
    pred_probs = torch.sigmoid(pred_logits)
    intersection = (pred_probs * target).sum()
    union = pred_probs.sum() + target.sum()
    return 1.0 - (2.0 * intersection + eps) / (union + eps)


def get_sam_embedding(predictor: Any, img_path: str, image_id: str, device: str) -> Any:
    cache_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "cache",
        "sam_embeddings",
    )
    safe_id = hashlib.sha256(image_id.encode()).hexdigest()
    cache_path = os.path.join(cache_dir, f"{safe_id}.pt")

    with cache_lock:
        if os.path.exists(cache_path):
            img_mtime = os.path.getmtime(img_path)
            cache_mtime = os.path.getmtime(cache_path)
            if cache_mtime > img_mtime:
                try:
                    return torch.load(cache_path, map_location=device)
                except Exception:
                    pass

    import cv2

    image = cv2.imread(img_path)
    if image is not None:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    predictor.set_image(image)
    embedding = predictor.get_image_embedding()

    with cache_lock:
        os.makedirs(cache_dir, exist_ok=True)
        temp_file = tempfile.NamedTemporaryFile(
            dir=cache_dir, delete=False, suffix=".pt"
        )
        try:
            torch.save(embedding, temp_file.name)
            temp_file.close()
            os.replace(temp_file.name, cache_path)
        except Exception as e:
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
            raise e

    return embedding


def _ensure_tables(db: Session) -> None:
    for table_cls in [SegmentationMask, TrainingRun]:
        if not inspect(db.get_bind()).has_table(table_cls.__tablename__):
            table = table_cls.__table__
            assert isinstance(table, Table)
            Base.metadata.create_all(bind=db.get_bind(), tables=[table])


def _ensure_metrics_column(db: Session) -> None:
    try:
        db.execute(
            text("ALTER TABLE training_runs ADD COLUMN metrics TEXT DEFAULT '[]'")
        )
        db.commit()
    except Exception:
        pass


def _annotations_to_masks(
    db: Session,
    project_id: str,
    images: list[dict[str, Any]],
) -> dict[str, Any]:
    """Build a masks_by_image dict from polygon annotations.

    Returns a dict mapping image_id to a dummy object with ``mask_data``
    (RLE JSON) and ``bbox_prompt`` (JSON ``[x1, y1, x2, y2]``) attributes.
    """
    image_ids = [img["id"] for img in images]
    image_dims = {img["id"]: (img["width"], img["height"]) for img in images}

    annotations = (
        db.query(Annotation)
        .filter(
            Annotation.image_id.in_(image_ids),
            Annotation.type == "polygon",
        )
        .all()
    )

    import cv2

    masks_by_image: dict[str, dict[str, Any]] = {}
    for ann in annotations:
        ann_data: dict[str, Any] = masks_by_image.setdefault(ann.image_id, {"segments": [], "bbox": None})
        points_raw = json.loads(ann.points) if ann.points else []
        if not points_raw:
            continue

        w_img, h_img = image_dims.get(ann.image_id, (800, 600))
        pts = np.array(
            [[int(p["x"] / 100 * w_img), int(p["y"] / 100 * h_img)] for p in points_raw],
            dtype=np.int32,
        )
        mask = np.zeros((h_img, w_img), dtype=np.uint8)
        cv2.fillPoly(mask, [pts], 1)

        rle = mask_to_rle(mask)
        ann_data["segments"].append(rle)

        bx, by, bw, bh = ann.x / 100 * w_img, ann.y / 100 * h_img, ann.w / 100 * w_img, ann.h / 100 * h_img
        new_box = [int(bx), int(by), int(bx + bw), int(by + bh)]
        if ann_data["bbox"] is None:
            ann_data["bbox"] = new_box
        else:
            ann_data["bbox"] = [
                min(ann_data["bbox"][0], new_box[0]),
                min(ann_data["bbox"][1], new_box[1]),
                max(ann_data["bbox"][2], new_box[2]),
                max(ann_data["bbox"][3], new_box[3]),
            ]

    class _MaskProxy:
        __slots__ = ("mask_data", "bbox_prompt")
        def __init__(self, mask_data: str, bbox_prompt: str) -> None:
            self.mask_data = mask_data
            self.bbox_prompt = bbox_prompt

    result: dict[str, Any] = {}
    for img_id, data in masks_by_image.items():
        if not data["segments"]:
            continue
        merged = data["segments"][0]
        if len(data["segments"]) > 1:
            decoded = [rle_to_mask(s) for s in data["segments"]]
            merged_arr = np.logical_or.reduce(decoded).astype(np.uint8)
            merged = mask_to_rle(merged_arr)
        result[img_id] = _MaskProxy(
            mask_data=json.dumps(merged),
            bbox_prompt=json.dumps(data["bbox"]),
        )
    return result


def cleanup_stale_cache() -> None:
    cache_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "cache",
        "sam_embeddings",
    )
    for tmp_file in glob.glob(os.path.join(cache_dir, "*.pt.tmp*")) + glob.glob(
        os.path.join(cache_dir, "*_tmp.pt*")
    ):
        try:
            os.remove(tmp_file)
        except OSError:
            pass


def run_sam_training(cfg: TrainingConfig) -> None:
    with sam_training_lock:
        cleanup_stale_cache()
        metrics_history: list[dict[str, Any]] = []
        db: Session | None = None
        try:
            _update_run(cfg.run_id, status="Running", current_epoch=0)

            timestamp = time.strftime("%Y%m%d_%H%M%S")
            work_dir = (
                Path(tempfile.gettempdir()) / f"sam_training_{cfg.run_id}_{timestamp}"
            )
            work_dir.mkdir(parents=True, exist_ok=True)

            device = "cuda" if torch.cuda.is_available() else "cpu"
            sam_model: Any
            sam_model, predictor = load_sam_model(device=device)

            if ResizeLongestSide is None:
                raise ImportError("ResizeLongestSide is required from segment_anything")
            transform = ResizeLongestSide(sam_model.image_encoder.img_size)

            db = SessionLocal()
            start_time = time.time()
            _ensure_tables(db)
            _ensure_metrics_column(db)

            # Build masks from polygon annotations
            masks_by_image = _annotations_to_masks(db, cfg.project_id, list(cfg.images))

            images = list(cfg.images)
            has_cog = any(is_cog_file(img.get("file_name", "")) for img in images)
            if has_cog:
                anns_by_image: dict[str, list[Annotation]] = {}
                all_anns = db.query(Annotation).filter(
                    Annotation.image_id.in_([img["id"] for img in images])
                ).all()
                for ann in all_anns:
                    anns_by_image.setdefault(ann.image_id, []).append(ann)
                expanded_images, expanded_masks = prepare_cog_dataset_sam(
                    images=images,
                    anns_by_image=anns_by_image,
                    work_dir=work_dir,
                )
                images = expanded_images
                masks_by_image.update(expanded_masks)

            random.shuffle(images)
            n = len(images)
            if n <= 1:
                train_images = images
                val_images = images
            else:
                train_end = max(1, int(n * 0.7))
                val_end = max(train_end + 1, int(n * 0.85))
                train_images = images[:train_end]
                val_images = images[train_end:val_end] if val_end <= n else images[-1:]

            # Download images
            img_path_map = {}
            for subset_name, subset_images in [
                ("train", train_images),
                ("val", val_images),
            ]:
                subset_dir = work_dir / "images" / subset_name
                subset_dir.mkdir(parents=True, exist_ok=True)

                for img in subset_images:
                    if img["id"] not in masks_by_image:
                        continue
                    if img.get("_is_cog_tile"):
                        tile_info = img.get("_tile_info")
                        if tile_info:
                            src_tile = work_dir / "cog_tiles" / tile_info.tile_name
                            dest_name = f"tile_{img['id']}.png"
                            dest_img = subset_dir / dest_name
                            if src_tile.exists():
                                import shutil
                                shutil.copy2(str(src_tile), str(dest_img))
                                img_path_map[img["id"]] = str(dest_img)
                            else:
                                print(f"Warning: missing source tile {src_tile}")
                        else:
                            print(f"Warning: missing tile_info for {img.get('id', 'unknown')}")
                        continue
                    try:
                        _download_image(img, subset_dir)
                        safe_name = Path(img["file_name"]).name
                        img_path_map[img["id"]] = str(subset_dir / safe_name)
                    except Exception as exc:
                        print(f"Warning: failed to download {img['file_name']}: {exc}")

            db.close()
            db = SessionLocal()

            # Validate that we have some data
            annotated_train = [img for img in train_images if img["id"] in img_path_map]
            annotated_val = [img for img in val_images if img["id"] in img_path_map]

            if not annotated_train:
                raise RuntimeError(
                    "No annotated training images could be resolved or downloaded"
                )

            # Optimizer setups
            optimizer = torch.optim.AdamW(
                sam_model.mask_decoder.parameters(), lr=1e-4, weight_decay=0.01
            )
            bce_loss_fn = nn.BCEWithLogitsLoss()

            for epoch in range(cfg.epochs):
                event = _cancelled_runs.get(cfg.run_id)
                if event and event.is_set():
                    raise RuntimeError("Training cancelled by user")

                # --- Train Phase ---
                sam_model.mask_decoder.train()
                train_loss_accum = 0.0
                train_count = 0

                # Shuffle train items
                random.shuffle(annotated_train)

                for img in annotated_train:
                    img_id = img["id"]
                    img_path = img_path_map[img_id]
                    mask_obj = masks_by_image[img_id]

                    # Load mask and bbox
                    try:
                        mask_dict = json.loads(mask_obj.mask_data)
                        gt_mask_np = rle_to_mask(mask_dict)
                    except Exception:
                        continue

                    try:
                        bbox = json.loads(mask_obj.bbox_prompt)
                    except Exception:
                        # Derive bbox dynamically from mask
                        y_idx, x_idx = np.where(gt_mask_np == 1)
                        if len(x_idx) > 0 and len(y_idx) > 0:
                            bbox = [
                                int(np.min(x_idx)),
                                int(np.min(y_idx)),
                                int(np.max(x_idx)),
                                int(np.max(y_idx)),
                            ]
                        else:
                            bbox = [0, 0, 0, 0]

                    H, W = gt_mask_np.shape

                    # Extract caching/loading embedding
                    embedding = get_sam_embedding(
                        predictor, img_path, img_id, device=device
                    )

                    # Prepare bbox and project to torch
                    transformed_box = transform.apply_boxes(np.array([bbox]), (H, W))
                    box_tensor = torch.as_tensor(
                        transformed_box, dtype=torch.float, device=device
                    )

                    # Forward Pass
                    sparse_embeddings, dense_embeddings = sam_model.prompt_encoder(
                        points=None,
                        boxes=box_tensor[None, :, :],  # B=1, N=1, coordinates=4
                        masks=None,
                    )

                    low_res_masks, iou_predictions = sam_model.mask_decoder(
                        image_embeddings=embedding,
                        image_pe=sam_model.prompt_encoder.get_dense_pe(),
                        sparse_prompt_embeddings=sparse_embeddings,
                        dense_prompt_embeddings=dense_embeddings,
                        multimask_output=False,
                    )

                    upscaled_logits = F.interpolate(
                        low_res_masks, size=(H, W), mode="bilinear", align_corners=False
                    ).squeeze(0)  # Shape (1, H, W)

                    gt_tensor = torch.as_tensor(
                        gt_mask_np, dtype=torch.float32, device=device
                    ).unsqueeze(0)

                    # Combined loss
                    loss_bce = bce_loss_fn(upscaled_logits, gt_tensor)
                    loss_dice = dice_loss(upscaled_logits, gt_tensor)
                    loss = 0.5 * loss_bce + 0.5 * loss_dice

                    optimizer.zero_grad()
                    loss.backward()
                    optimizer.step()

                    train_loss_accum += loss.item()
                    train_count += 1

                if train_count == 0:
                    raise RuntimeError(
                        "No valid masks were processed during training epoch"
                    )

                # --- Validation Phase ---
                sam_model.mask_decoder.eval()
                val_iou_accum = 0.0
                val_count = 0

                with torch.no_grad():
                    for img in annotated_val:
                        img_id = img["id"]
                        img_path = img_path_map[img_id]
                        mask_obj = masks_by_image[img_id]

                        try:
                            mask_dict = json.loads(mask_obj.mask_data)
                            gt_mask_np = rle_to_mask(mask_dict)
                        except Exception:
                            continue

                        try:
                            bbox = json.loads(mask_obj.bbox_prompt)
                        except Exception:
                            y_idx, x_idx = np.where(gt_mask_np == 1)
                            if len(x_idx) > 0 and len(y_idx) > 0:
                                bbox = [
                                    int(np.min(x_idx)),
                                    int(np.min(y_idx)),
                                    int(np.max(x_idx)),
                                    int(np.max(y_idx)),
                                ]
                            else:
                                bbox = [0, 0, 0, 0]

                        H, W = gt_mask_np.shape

                        embedding = get_sam_embedding(
                            predictor, img_path, img_id, device=device
                        )

                        transformed_box = transform.apply_boxes(
                            np.array([bbox]), (H, W)
                        )
                        box_tensor = torch.as_tensor(
                            transformed_box, dtype=torch.float, device=device
                        )

                        sparse_embeddings, dense_embeddings = sam_model.prompt_encoder(
                            points=None,
                            boxes=box_tensor[None, :, :],
                            masks=None,
                        )

                        low_res_masks, iou_predictions = sam_model.mask_decoder(
                            image_embeddings=embedding,
                            image_pe=sam_model.prompt_encoder.get_dense_pe(),
                            sparse_prompt_embeddings=sparse_embeddings,
                            dense_prompt_embeddings=dense_embeddings,
                            multimask_output=False,
                        )

                        upscaled_logits = F.interpolate(
                            low_res_masks,
                            size=(H, W),
                            mode="bilinear",
                            align_corners=False,
                        ).squeeze(0)

                        gt_tensor = torch.as_tensor(
                            gt_mask_np, dtype=torch.float32, device=device
                        ).unsqueeze(0)

                        # Calculate Validation IoU
                        pred_mask = (torch.sigmoid(upscaled_logits) > 0.5).float()
                        intersection = (pred_mask * gt_tensor).sum().item()
                        union = (
                            pred_mask.sum().item()
                            + gt_tensor.sum().item()
                            - intersection
                        )
                        iou = (intersection + 1e-6) / (union + 1e-6)

                        val_iou_accum += iou
                        val_count += 1

                epoch_num = epoch + 1
                mean_loss = train_loss_accum / max(1, train_count)
                mean_iou = val_iou_accum / max(1, val_count) if val_count > 0 else 0.0

                # Map to database metric updates
                _update_run(cfg.run_id, current_epoch=min(epoch_num, cfg.epochs))

                ep_metrics = {
                    "epoch": epoch_num,
                    "accuracy": float(mean_iou),
                    "loss": float(mean_loss),
                    "metric_type": "iou",
                }
                metrics_history.append(ep_metrics)

                try:
                    _update_run(
                        cfg.run_id,
                        metrics=json.dumps(metrics_history),
                        accuracy=float(mean_iou),
                        loss=float(mean_loss),
                    )
                except Exception:
                    pass

            # Save full checkpoint or State Dict to models directory
            model_dir = MODELS_DIR / str(cfg.run_id)
            model_dir.mkdir(parents=True, exist_ok=True)
            # Save models state dict
            torch.save(sam_model.state_dict(), str(model_dir / "best.pt"))

            # Finish Job updates
            _update_run(
                cfg.run_id,
                status="Completed",
                current_epoch=cfg.epochs,
                duration=time.strftime(
                    "%Hh %Mm %Ss", time.gmtime(time.time() - start_time)
                ),
            )

            shutil.rmtree(work_dir, ignore_errors=True)

        except Exception as exc:
            import traceback

            tb = traceback.format_exc()
            _update_run(
                cfg.run_id,
                status="Failed",
                error_message=f"{str(exc)}\n{tb}",
                metrics=json.dumps(metrics_history),
            )
            if "work_dir" in locals():
                shutil.rmtree(work_dir, ignore_errors=True)
        finally:
            _cancelled_runs.pop(cfg.run_id, None)
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass
