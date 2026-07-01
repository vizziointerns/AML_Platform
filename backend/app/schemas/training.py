from pydantic import BaseModel, Field
from typing import Literal


class TrainingRunCreate(BaseModel):
    dataset_id: str
    name: str
    task_type: Literal["detect", "segment"]
    epochs: int = Field(gt=0)


class TrainingRunUpdate(BaseModel):
    name: str | None = None
    status: Literal["Queued", "Running", "Completed", "Failed"] | None = None
    accuracy: float | None = None
    loss: float | None = None
    current_epoch: int | None = Field(None, ge=0)
    duration: str | None = None


class TrainingRunOut(BaseModel):
    id: int
    project_id: str
    dataset_id: str
    name: str
    task_type: Literal["detect", "segment"]
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
    metrics: str | None = None


class TrainingImageInfo(BaseModel):
    id: str
    file_name: str
    file_url: str
    width: int = 800
    height: int = 600


class TrainingClassInfo(BaseModel):
    id: str
    name: str
    index: int = 0


class TrainingStartPayload(BaseModel):
    images: list[TrainingImageInfo]
    classes: list[TrainingClassInfo]
    google_access_token: str | None = None


class TrainingRunListOut(BaseModel):
    runs: list[TrainingRunOut]
