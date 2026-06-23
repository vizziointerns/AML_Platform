from pydantic import BaseModel


class AnnotationPoint(BaseModel):
    x: float
    y: float


class MaskLine(BaseModel):
    points: list[float]
    brush_size: float
    tool: str


class AnnotationIn(BaseModel):
    image_id: str
    annotation_id: str
    type: str
    class_id: str
    x: float
    y: float
    w: float
    h: float
    points: list[AnnotationPoint] | None = None
    lines: list[MaskLine] | None = None


class AnnotationOut(BaseModel):
    id: int
    image_id: str
    annotation_id: str
    type: str
    class_id: str
    x: float
    y: float
    w: float
    h: float
    points: list[AnnotationPoint] | None = None
    lines: list[MaskLine] | None = None


class AnnotationListOut(BaseModel):
    annotations: list[AnnotationOut]


class AnnotationDeleteRequest(BaseModel):
    annotation_ids: list[str]
