"""Create the initial reading tracker schema.

Revision ID: 20260804_01
Revises:
Create Date: 2026-08-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260804_01"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "households",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_households")),
    )
    op.create_table(
        "books",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("subtitle", sa.Text()),
        sa.Column("authors", postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("isbn_10", sa.Text()),
        sa.Column("isbn_13", sa.Text()),
        sa.Column("cover_url", sa.Text()),
        sa.Column("publisher", sa.Text()),
        sa.Column("published_date", sa.Text()),
        sa.Column("page_count", sa.Integer()),
        sa.Column("description", sa.Text()),
        sa.Column("language", sa.Text()),
        sa.Column("metadata_source", sa.String(length=12), nullable=False),
        sa.Column("external_source_id", sa.Text()),
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
        sa.CheckConstraint("page_count > 0", name="ck_books_page_count_positive"),
        sa.CheckConstraint(
            "metadata_source IN ('manual', 'google_books', 'open_library')",
            name="ck_books_metadata_source",
        ),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["households.id"],
            name=op.f("fk_books_household_id_households"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_books")),
    )
    op.create_index("ix_books_household_id", "books", ["household_id"])
    op.create_table(
        "household_members",
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=9), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('owner', 'caregiver')", name="ck_household_members_role"
        ),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["households.id"],
            name=op.f("fk_household_members_household_id_households"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "household_id", "user_id", name=op.f("pk_household_members")
        ),
    )
    op.create_table(
        "readers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("avatar_key", sa.Text()),
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
            ["household_id"],
            ["households.id"],
            name=op.f("fk_readers_household_id_households"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_readers")),
    )
    op.create_index("ix_readers_household_id", "readers", ["household_id"])
    op.create_table(
        "reader_books",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=8), nullable=False),
        sa.Column("started_at", sa.Date()),
        sa.Column("finished_at", sa.Date()),
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
        sa.CheckConstraint(
            "status IN ('planned', 'reading', 'finished')",
            name="ck_reader_books_status",
        ),
        sa.CheckConstraint(
            "finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at",
            name="ck_reader_books_date_order",
        ),
        sa.ForeignKeyConstraint(
            ["book_id"],
            ["books.id"],
            name=op.f("fk_reader_books_book_id_books"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reader_id"],
            ["readers.id"],
            name=op.f("fk_reader_books_reader_id_readers"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reader_books")),
        sa.UniqueConstraint("reader_id", "book_id", name="uq_reader_books_reader_book"),
    )
    op.create_index("ix_reader_books_book_id", "reader_books", ["book_id"])
    op.create_table(
        "reading_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("start_page", sa.Integer()),
        sa.Column("end_page", sa.Integer()),
        sa.Column("activity_type", sa.String(length=11), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column(
            "finished_book",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
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
        sa.CheckConstraint("minutes > 0", name="ck_reading_sessions_minutes_positive"),
        sa.CheckConstraint(
            "start_page IS NULL OR start_page >= 0",
            name="ck_reading_sessions_start_page_nonnegative",
        ),
        sa.CheckConstraint(
            "end_page IS NULL OR end_page >= 0",
            name="ck_reading_sessions_end_page_nonnegative",
        ),
        sa.CheckConstraint(
            "start_page IS NULL OR end_page IS NULL OR end_page >= start_page",
            name="ck_reading_sessions_page_order",
        ),
        sa.CheckConstraint(
            "activity_type IN ('independent', 'with_adult', 'read_aloud', 'audiobook')",
            name="ck_reading_sessions_activity_type",
        ),
        sa.ForeignKeyConstraint(
            ["book_id"],
            ["books.id"],
            name=op.f("fk_reading_sessions_book_id_books"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reader_id"],
            ["readers.id"],
            name=op.f("fk_reading_sessions_reader_id_readers"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reading_sessions")),
    )
    op.create_index("ix_reading_sessions_book_id", "reading_sessions", ["book_id"])
    op.create_index(
        "ix_reading_sessions_reader_date",
        "reading_sessions",
        ["reader_id", "session_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_reading_sessions_reader_date", table_name="reading_sessions")
    op.drop_index("ix_reading_sessions_book_id", table_name="reading_sessions")
    op.drop_table("reading_sessions")
    op.drop_index("ix_reader_books_book_id", table_name="reader_books")
    op.drop_table("reader_books")
    op.drop_index("ix_readers_household_id", table_name="readers")
    op.drop_table("readers")
    op.drop_table("household_members")
    op.drop_index("ix_books_household_id", table_name="books")
    op.drop_table("books")
    op.drop_table("households")
