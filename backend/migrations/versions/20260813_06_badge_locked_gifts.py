"""Add optional badge requirements to gifts.

Revision ID: 20260813_06
Revises: 20260813_05
Create Date: 2026-08-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260813_06"
down_revision: str | None = "20260813_05"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "reward_items",
        sa.Column("required_badge_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_reward_items_required_badge_id_badge_definitions",
        "reward_items",
        "badge_definitions",
        ["required_badge_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_reward_items_required_badge_id_badge_definitions",
        "reward_items",
        type_="foreignkey",
    )
    op.drop_column("reward_items", "required_badge_id")
