import logging
from pathlib import Path

import cv2
import numpy as np
import torch

from app.schemas.segment import Point2D, PolygonOut

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "models"

_SAM_PREDICTOR = None


def _load_model() -> object:
    global _SAM_PREDICTOR
    if _SAM_PREDICTOR is not None:
        return _SAM_PREDICTOR

    from sam2.sam2_image_predictor import SAM2ImagePredictor

    ckpt = MODELS_DIR / "sam2.1_hiera_tiny.pt"
    cfg = MODELS_DIR / "sam2.1_hiera_t.yaml"

    if not ckpt.exists():
        raise RuntimeError(
            f"SAM 2.1 checkpoint not found at {ckpt}. "
            f"Run `python scripts/download_sam_checkpoint.py` first."
        )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Loading SAM 2.1 model on %s ...", device)

    predictor = SAM2ImagePredictor.from_pretrained(
        "facebook/sam2.1-hiera-tiny",
        device=device,
    )
    _SAM_PREDICTOR = predictor
    return predictor


def _mask_to_polygons(mask: np.ndarray, min_area: int = 50) -> list[list[tuple[float, float]]]:
    contours, _ = cv2.findContours(
        (mask > 0).astype(np.uint8),
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )
    polygons: list[list[tuple[float, float]]] = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
        epsilon = 0.002 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        points = [(float(p[0][0]), float(p[0][1])) for p in approx]
        if len(points) >= 3:
            polygons.append(points)
    return polygons


def run_segmentation(
    image: np.ndarray,
    prompt_type: str,
    prompt_data: list[float],
) -> list[PolygonOut]:
    predictor = _load_model()

    predictor.set_image(image)

    if prompt_type == "point":
        if len(prompt_data) < 2:
            raise ValueError("prompt_data must have at least 2 values for point prompt")
        point_coords = np.array([[prompt_data[0], prompt_data[1]]], dtype=np.float32)
        point_labels = np.array([1], dtype=np.int32)
        masks, _, _ = predictor.predict(
            point_coords=point_coords,
            point_labels=point_labels,
            multimask_output=True,
        )
    elif prompt_type == "box":
        if len(prompt_data) < 4:
            raise ValueError("prompt_data must have 4 values for box prompt")
        x1, y1, x2, y2 = prompt_data[:4]
        box = np.array([x1, y1, x2, y2], dtype=np.float32)
        masks, _, _ = predictor.predict(
            box=box,
            multimask_output=False,
        )
    else:
        raise ValueError(f"Unsupported prompt_type: {prompt_type}")

    height, width = image.shape[:2]
    polygons: list[PolygonOut] = []

    for mask_idx in range(masks.shape[0]):
        raw_polys = _mask_to_polygons(masks[mask_idx])
        for poly in raw_polys:
            normalized = [
                Point2D(x=round(p[0] / width * 100, 2), y=round(p[1] / height * 100, 2))
                for p in poly
            ]
            polygons.append(PolygonOut(points=normalized))

    return polygons


def auto_segment(image: np.ndarray) -> list[PolygonOut]:
    predictor = _load_model()
    from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator

    mask_generator = SAM2AutomaticMaskGenerator(
        model=predictor.model,
        points_per_side=16,
        pred_iou_thresh=0.7,
        stability_score_thresh=0.85,
        min_mask_region_area=200,
    )
    masks = mask_generator.generate(image)

    height, width = image.shape[:2]
    polygons: list[PolygonOut] = []

    for mask_data in masks:
        mask = mask_data["segmentation"]
        raw_polys = _mask_to_polygons(mask)
        for poly in raw_polys:
            normalized = [
                Point2D(x=round(p[0] / width * 100, 2), y=round(p[1] / height * 100, 2))
                for p in poly
            ]
            polygons.append(PolygonOut(points=normalized))

    return polygons
