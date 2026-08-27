"""Create reader profiles when login invitations are accepted.

Revision ID: 20260826_12
Revises: 20260825_11
Create Date: 2026-08-26
"""

from collections.abc import Sequence

from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260826_12"
down_revision: str | None = "20260825_11"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "reader_login_invitations",
        "reader_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    op.execute("DELETE FROM reader_login_invitations WHERE reader_id IS NULL")
    op.alter_column(
        "reader_login_invitations",
        "reader_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
