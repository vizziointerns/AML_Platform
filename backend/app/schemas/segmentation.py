from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SegmentationMaskBase(BaseModel):
    project_id: str
    image_id: str
    mask_data: str  # COCO RLE encoded JSON/String
    bbox_prompt: (
        str  # JSON representation of [x1, y1, x2, y2] or [x_min, y_min, x_max, y_max]
    )


class SegmentationMaskCreate(SegmentationMaskBase):
    pass


class SegmentationMaskOut(SegmentationMaskBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SegmentationImage(BaseModel):
    id: str
    file_name: str
    file_url: str
    width: int
    height: int


class SegmentationClass(BaseModel):
    id: str
    name: str
    index: int


class SegmentationTrainRequest(BaseModel):
    dataset_id: str
    name: str
    model_type: str = "sam_vit_b"
    epochs: int = 50
    images: list[SegmentationImage]
    classes: list[SegmentationClass]


class PredictRequest(BaseModel):
    image_url: str
    bbox: list[float]  # [x1, y1, x2, y2]


class PredictResponse(BaseModel):
    mask: str  # RLE encoding string of predicted mask
    bbox: list[float]  # [x1, y1, x2, y2] prompt used or derived
    confidence: float
