from pydantic import BaseModel


class Project(BaseModel):
    id: str
    name: str
    type: str
    status: str
    datasetCount: int = 0
    annotationProgress: int = 0
    members: list[str] = []
    lastUpdated: str = ""
    created_at: str = ""
