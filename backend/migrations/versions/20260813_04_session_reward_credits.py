"""Award credits for reading sessions instead of badges.

Revision ID: 20260813_04
Revises: 20260813_03
Create Date: 2026-08-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260813_04"
down_revision: str | None = "20260813_03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_badge_definitions_credit", "badge_definitions", type_="check"
    )
    op.execute(sa.text("UPDATE badge_definitions SET credit_value = 0"))
    op.create_check_constraint(
        "ck_badge_definitions_credit",
        "badge_definitions",
        "credit_value >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_badge_definitions_credit", "badge_definitions", type_="check"
    )
    op.execute(sa.text("UPDATE badge_definitions SET credit_value = 1"))
    op.create_check_constraint(
        "ck_badge_definitions_credit",
        "badge_definitions",
        "credit_value > 0",
    )
