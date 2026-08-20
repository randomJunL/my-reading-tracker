"""Award credits for badges and remove badge-gated gifts.

Revision ID: 20260813_07
Revises: 20260813_06
Create Date: 2026-08-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260813_07"
down_revision: str | None = "20260813_06"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BADGE_CREDITS = {
    "first-book": 3,
    "book-explorer": 8,
    "book-adventurer": 12,
    "book-champion": 20,
    "reading-legend": 30,
    "steady-reader": 3,
    "strong-reading-week": 5,
    "perfect-reading-week": 8,
    "building-a-habit": 6,
    "monthly-momentum": 10,
    "reading-routine": 16,
    "season-of-reading": 24,
    "three-day-reader": 3,
    "one-week-reader": 7,
    "two-week-reader": 12,
    "monthly-reader": 20,
    "reading-marathon": 30,
}


def upgrade() -> None:
    for code, credits in BADGE_CREDITS.items():
        op.execute(
            sa.text(
                "UPDATE badge_definitions "
                "SET credit_value = :credits "
                "WHERE code = :code"
            ).bindparams(code=code, credits=credits)
        )
    op.drop_constraint(
        "fk_reward_items_required_badge_id_badge_definitions",
        "reward_items",
        type_="foreignkey",
    )
    op.drop_column("reward_items", "required_badge_id")


def downgrade() -> None:
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
    op.execute(sa.text("UPDATE badge_definitions SET credit_value = 0"))
