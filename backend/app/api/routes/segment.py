import logging
import tempfile
from pathlib import Path

import httpx
import numpy as np
from fastapi import APIRouter, HTTPException
from PIL import Image

from app.schemas.segment import SegmentRequest, SegmentResponse
from app.training.segment import auto_segment, run_segmentation

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_IMAGE_SIZE = 10 * 1024 * 1024
CHUNK_SIZE = 64 * 1024
MAX_REDIRECTS = 20


@router.post("/segment", response_model=SegmentResponse)
def segment_endpoint(body: SegmentRequest) -> SegmentResponse:
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    try:
        with httpx.Client(
            timeout=60, follow_redirects=True, max_redirects=MAX_REDIRECTS
        ) as client:
            response = client.get(body.image_url)
            response.raise_for_status()
            for chunk in response.iter_bytes(CHUNK_SIZE):
                if tmp.tell() + len(chunk) > MAX_IMAGE_SIZE:
                    raise HTTPException(status_code=400, detail="Image exceeds maximum size")
                tmp.write(chunk)
        tmp.close()

        image = np.array(Image.open(tmp.name).convert("RGB"))

        if body.auto_mode:
            polygons = auto_segment(image)
        else:
            if body.prompt_data is None:
                raise HTTPException(status_code=400, detail="prompt_data required when auto_mode is False")
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
