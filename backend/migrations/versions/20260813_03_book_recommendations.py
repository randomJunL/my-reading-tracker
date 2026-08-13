"""Add household book recommendations.

Revision ID: 20260813_03
Revises: 20260813_02
Create Date: 2026-08-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260813_03"
down_revision: str | None = "20260813_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "book_recommendations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["household_id"], ["households.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_book_recommendations")),
        sa.UniqueConstraint(
            "household_id",
            "book_id",
            name="uq_book_recommendations_household_book",
        ),
    )
    op.create_index(
        "ix_book_recommendations_household_id",
        "book_recommendations",
        ["household_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_book_recommendations_household_id",
        table_name="book_recommendations",
    )
    op.drop_table("book_recommendations")
