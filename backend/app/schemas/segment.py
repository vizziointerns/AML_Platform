from pydantic import BaseModel


class Point2D(BaseModel):
    x: float
    y: float


class PolygonOut(BaseModel):
    points: list[Point2D]


class SegmentRequest(BaseModel):
    image_url: str
    prompt_type: str = "point"
    prompt_data: list[float] | None = None
    class_name: str | None = None
    auto_mode: bool = False
    model_version: str = "sam2.1"


class SegmentResponse(BaseModel):
    polygons: list[PolygonOut]
    class_name: str | None = None
