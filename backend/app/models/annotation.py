from sqlalchemy import String, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Annotation(Base):
    __tablename__ = "annotations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    image_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    annotation_id: Mapped[str] = mapped_column(String(32), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    class_id: Mapped[str] = mapped_column(String(64), nullable=False)
    x: Mapped[float] = mapped_column(nullable=False)
    y: Mapped[float] = mapped_column(nullable=False)
    w: Mapped[float] = mapped_column(nullable=False)
    h: Mapped[float] = mapped_column(nullable=False)
    points: Mapped[str | None] = mapped_column(Text, nullable=True)
    lines: Mapped[str | None] = mapped_column(Text, nullable=True)
