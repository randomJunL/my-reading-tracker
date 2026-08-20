"""Block direct Supabase Data API access to application tables.

Revision ID: 20260815_09
Revises: 20260814_08
Create Date: 2026-08-15
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260815_09"
down_revision: str | None = "20260814_08"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APPLICATION_TABLES = (
    "households",
    "household_members",
    "reader_login_invitations",
    "readers",
    "books",
    "reader_books",
    "reading_sessions",
    "book_recommendations",
    "badge_definitions",
    "reader_badges",
    "reader_reward_progress",
    "reward_items",
    "reward_redemptions",
    "reward_transactions",
)


def upgrade() -> None:
    for table_name in APPLICATION_TABLES:
        op.execute(f'ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    for table_name in APPLICATION_TABLES:
        op.execute(f'ALTER TABLE "{table_name}" DISABLE ROW LEVEL SECURITY')
