from datetime import datetime, timezone

from sqlalchemy import String, Float, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dataset_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    task_type: Mapped[str] = mapped_column(String(64), nullable=False)
    epochs: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="queued", nullable=False)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_epoch: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[str] = mapped_column(
        String(32),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False,
    )
    started_at: Mapped[str | None] = mapped_column(String(32), nullable=True)
    completed_at: Mapped[str | None] = mapped_column(String(32), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[str | None] = mapped_column(Text, nullable=True, default="[]")
