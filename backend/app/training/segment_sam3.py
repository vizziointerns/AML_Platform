from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image

from app.core.config import settings
from app.schemas.segment import Point2D, PolygonOut
from app.training.segment import mask_to_polygons

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "models"

_SAM3_MODEL = None
_SAM3_PROCESSOR = None
_SAM3_LOCK = threading.Lock()

def _load_sam3_model() -> tuple[Any, Any]:
    global _SAM3_MODEL, _SAM3_PROCESSOR
    if _SAM3_MODEL is not None and _SAM3_PROCESSOR is not None:
        return _SAM3_MODEL, _SAM3_PROCESSOR
    with _SAM3_LOCK:
        if _SAM3_MODEL is not None and _SAM3_PROCESSOR is not None:
            return _SAM3_MODEL, _SAM3_PROCESSOR

        try:
            from transformers import Sam3Model, Sam3Processor
        except ImportError:
            raise RuntimeError(
                "transformers is required for SAM3. "
                "Install it with: pip install transformers>=4.50.0"
            )

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Loading SAM3 model on %s ...", device)

        token = settings.hf_token or None

        try:
            processor = Sam3Processor.from_pretrained("facebook/sam3", token=token)
            model = Sam3Model.from_pretrained("facebook/sam3", token=token).to(device)  # type: ignore[arg-type]
            model.eval()
        except OSError as e:
            if "gated" in str(e):
                raise RuntimeError(
                    "facebook/sam3 is a gated model. "
                    "Either:\n"
                    "  1. Run `huggingface-cli login` and accept the terms at "
                    "https://huggingface.co/facebook/sam3\n"
                    "  2. Set the HF_TOKEN environment variable with a valid token\n"
                ) from e
            raise RuntimeError(
                f"Failed to load SAM3 model from Hugging Face: {e}"
            ) from e

        _SAM3_PROCESSOR = processor
        _SAM3_MODEL = model
        return model, processor


def auto_segment(image: np.ndarray, class_name: str) -> list[PolygonOut]:
    model, processor = _load_sam3_model()

    pil_image = Image.fromarray(image)
    inputs = processor(images=pil_image, text=class_name, return_tensors="pt")

    device = next(model.parameters()).device
    inputs = {k: v.to(device) if torch.is_tensor(v) else v for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    original_sizes = inputs.get("original_sizes")
    if original_sizes is not None:
        target_sizes = original_sizes.tolist()
    else:
        target_sizes = [[image.shape[0], image.shape[1]]]
    results = processor.post_process_instance_segmentation(
        outputs,
        threshold=0.5,
        mask_threshold=0.5,
        target_sizes=target_sizes,
    )[0]

    height, width = image.shape[:2]
    polygons: list[PolygonOut] = []

    for mask_tensor in results["masks"]:
        if not isinstance(mask_tensor, torch.Tensor):
            continue
        mask_np = mask_tensor.cpu().numpy().astype(np.uint8)
        raw_polys = mask_to_polygons(mask_np)
        for poly in raw_polys:
            normalized = [
                Point2D(x=round(p[0] / width * 100, 2), y=round(p[1] / height * 100, 2))
                for p in poly
            ]
            polygons.append(PolygonOut(points=normalized))

    return polygons
