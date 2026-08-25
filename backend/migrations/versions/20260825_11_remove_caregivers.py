"""Remove caregiver accounts and invitations.

Revision ID: 20260825_11
Revises: 20260815_09
Create Date: 2026-08-25
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260825_11"
down_revision: str | None = "20260815_09"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DELETE FROM household_members WHERE role = 'caregiver'")
    op.drop_constraint("ck_household_members_role", "household_members", type_="check")
    op.create_check_constraint(
        "ck_household_members_role",
        "household_members",
        "role IN ('owner', 'reader')",
    )
    op.execute("DROP TABLE IF EXISTS caregiver_login_invitations")


def downgrade() -> None:
    op.drop_constraint("ck_household_members_role", "household_members", type_="check")
    op.create_check_constraint(
        "ck_household_members_role",
        "household_members",
        "role IN ('owner', 'caregiver', 'reader')",
    )
