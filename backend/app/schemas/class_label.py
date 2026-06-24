from pydantic import BaseModel


class ClassLabelCreate(BaseModel):
    class_id: str
    name: str
    color: str


class ClassLabelUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class ClassLabelOut(BaseModel):
    id: int
    dataset_id: str
    class_id: str
    name: str
    color: str
    index: int


class ClassLabelListOut(BaseModel):
    classes: list[ClassLabelOut]


class ClassLabelReorder(BaseModel):
    class_ids: list[str]
