from pydantic import BaseModel


class TrainingRunCreate(BaseModel):
    dataset_id: str
    name: str
    model_type: str
    epochs: int


class TrainingRunUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    accuracy: float | None = None
    loss: float | None = None
    current_epoch: int | None = None
    duration: str | None = None


class TrainingRunOut(BaseModel):
    id: int
    project_id: str
    dataset_id: str
    name: str
    model_type: str
    epochs: int
    status: str
    accuracy: float | None = None
    loss: float | None = None
    current_epoch: int = 0
    duration: str | None = None
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    error_message: str | None = None


class TrainingRunListOut(BaseModel):
    runs: list[TrainingRunOut]
