from typing import Literal
from pydantic import BaseModel


class Project(BaseModel):
    id: str
    name: str
    type: str
    status: str
    datasetCount: int = 0
    annotationProgress: int = 0
    members: list[str] = []
    lastUpdated: int = 0
    created_at: str = ""
    task_type: Literal["detect", "segment"] = "detect"
