"""Add restricted reader login roles and invitations.

Revision ID: 20260813_05
Revises: 20260813_04
Create Date: 2026-08-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260813_05"
down_revision: str | None = "20260813_04"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_household_members_role", "household_members", type_="check")
    op.create_check_constraint(
        "ck_household_members_role",
        "household_members",
        "role IN ('owner', 'caregiver', 'reader')",
    )
    op.add_column(
        "household_members",
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_household_members_reader_id_readers",
        "household_members",
        "readers",
        ["reader_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_household_members_reader_id", "household_members", ["reader_id"]
    )
    op.create_table(
        "reader_login_invitations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("accepted_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["household_id"], ["households.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["reader_id"], ["readers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reader_login_invitations")),
        sa.UniqueConstraint("email", name="uq_reader_login_invitations_email"),
        sa.UniqueConstraint("reader_id", name="uq_reader_login_invitations_reader_id"),
    )


def downgrade() -> None:
    op.drop_table("reader_login_invitations")
    op.drop_constraint(
        "uq_household_members_reader_id", "household_members", type_="unique"
    )
    op.drop_constraint(
        "fk_household_members_reader_id_readers",
        "household_members",
        type_="foreignkey",
    )
    op.drop_column("household_members", "reader_id")
    op.drop_constraint("ck_household_members_role", "household_members", type_="check")
    op.create_check_constraint(
        "ck_household_members_role",
        "household_members",
        "role IN ('owner', 'caregiver')",
    )
