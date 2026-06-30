from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SegmentationMask(Base):
    __tablename__ = "segmentation_masks"
    __table_args__ = (UniqueConstraint("project_id", "image_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("projects.id"), index=True, nullable=False)
    image_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    mask_data: Mapped[str] = mapped_column(Text, nullable=False)  # COCO RLE encoded JSON/String
    bbox_prompt: Mapped[str] = mapped_column(String(128), nullable=False)  # JSON representation of [x1, y1, x2, y2]
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
