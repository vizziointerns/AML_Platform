import logging
import tempfile
from pathlib import Path

import numpy as np
from fastapi import APIRouter, HTTPException
from PIL import Image

from app.schemas.segment import SegmentRequest, SegmentResponse
from app.training.inference import _validate_image_url
from app.training.segment import auto_segment as auto_segment_sam2
from app.training.segment import run_segmentation
from app.training.segment_sam3 import auto_segment as auto_segment_sam3
from app.utils.download import download_image_bytes

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_IMAGE_SIZE = 200 * 1024 * 1024


@router.post("/segment", response_model=SegmentResponse)
def segment_endpoint(body: SegmentRequest) -> SegmentResponse:
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    try:
        _validate_image_url(body.image_url)
        image_data = download_image_bytes(body.image_url, MAX_IMAGE_SIZE)
        tmp.write(image_data)
        tmp.close()

        image = np.array(Image.open(tmp.name).convert("RGB"))

        if body.auto_mode:
            if body.model_version == "sam3":
                if not body.class_name:
                    raise HTTPException(
                        status_code=400,
                        detail="class_name required for SAM3 auto segmentation",
                    )
                polygons = auto_segment_sam3(image, body.class_name)
            else:
                polygons = auto_segment_sam2(image)
        else:
            if body.prompt_data is None:
                raise HTTPException(
                    status_code=400,
                    detail="prompt_data required when auto_mode is False",
                )
            polygons = run_segmentation(image, body.prompt_type, body.prompt_data)

        return SegmentResponse(polygons=polygons, class_name=body.class_name)

    except HTTPException:
        raise
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as e:
        logger.exception("Segmentation failed")
        raise HTTPException(status_code=500, detail="Segmentation failed") from e
    finally:
        try:
            if not tmp.closed:
                tmp.close()
            Path(tmp.name).unlink(missing_ok=True)
        except OSError:
            logger.warning("Failed to clean up temp file", exc_info=True)
