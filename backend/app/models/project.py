from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    datasetCount: Mapped[int] = mapped_column(Integer, default=0)
    annotationProgress: Mapped[int] = mapped_column(Integer, default=0)
    members: Mapped[str] = mapped_column(Text, default="[]")
    lastUpdated: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(String(32), default="")
    task_type: Mapped[str] = mapped_column(String(16), default="detect")
