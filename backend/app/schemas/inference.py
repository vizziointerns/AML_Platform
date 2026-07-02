from pydantic import BaseModel


class InferenceRequest(BaseModel):
    image_url: str
    model_id: int | None = None


class InferredObject(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    x: float
    y: float
    w: float
    h: float


class InferenceResponse(BaseModel):
    predictions: list[InferredObject]
