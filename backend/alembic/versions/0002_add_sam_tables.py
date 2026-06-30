import sqlalchemy as sa
from alembic import op

revision = "0002_add_sam_tables"
down_revision = "0001_create_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create projects table if not exists
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column("datasetCount", sa.Integer(), nullable=False, default=0),
        sa.Column("annotationProgress", sa.Integer(), nullable=False, default=0),
        sa.Column("members", sa.Text(), nullable=False, default="[]"),
        sa.Column("lastUpdated", sa.Integer(), nullable=False, default=0),
        sa.Column("created_at", sa.String(length=32), nullable=False, default=""),
        sa.Column("task_type", sa.String(length=16), nullable=False, server_default="detect"),
    )

    # 2. Create segmentation_masks table
    op.create_table(
        "segmentation_masks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("image_id", sa.String(length=64), nullable=False),
        sa.Column("mask_data", sa.Text(), nullable=False),
        sa.Column("bbox_prompt", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        op.f("ix_segmentation_masks_project_id"),
        "segmentation_masks",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_segmentation_masks_image_id"),
        "segmentation_masks",
        ["image_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_segmentation_masks_image_id"), table_name="segmentation_masks")
    op.drop_index(op.f("ix_segmentation_masks_project_id"), table_name="segmentation_masks")
    op.drop_table("segmentation_masks")
    op.drop_table("projects")
