"""Add badges, reward credits, gifts, and redemptions.

Revision ID: 20260813_02
Revises: 20260804_01
Create Date: 2026-08-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260813_02"
down_revision: str | None = "20260804_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BADGES = [
    (
        "10000000-0000-4000-8000-000000000001",
        "first-book",
        "First Book",
        "Finished the first book.",
        "books_finished",
        1,
        "book-check",
        10,
    ),
    (
        "10000000-0000-4000-8000-000000000002",
        "book-explorer",
        "Book Explorer",
        "Finished five books.",
        "books_finished",
        5,
        "books",
        20,
    ),
    (
        "10000000-0000-4000-8000-000000000003",
        "book-adventurer",
        "Book Adventurer",
        "Finished ten books.",
        "books_finished",
        10,
        "compass",
        30,
    ),
    (
        "10000000-0000-4000-8000-000000000004",
        "book-champion",
        "Book Champion",
        "Finished twenty-five books.",
        "books_finished",
        25,
        "trophy",
        40,
    ),
    (
        "10000000-0000-4000-8000-000000000005",
        "reading-legend",
        "Reading Legend",
        "Finished fifty books.",
        "books_finished",
        50,
        "crown",
        50,
    ),
    (
        "10000000-0000-4000-8000-000000000006",
        "steady-reader",
        "Steady Reader",
        "Read on three days in one week.",
        "weekly_consistency",
        3,
        "calendar-check",
        60,
    ),
    (
        "10000000-0000-4000-8000-000000000007",
        "strong-reading-week",
        "Strong Reading Week",
        "Read on five days in one week.",
        "weekly_consistency",
        5,
        "calendar-heart",
        70,
    ),
    (
        "10000000-0000-4000-8000-000000000008",
        "perfect-reading-week",
        "Perfect Reading Week",
        "Read on all seven days in one week.",
        "weekly_consistency",
        7,
        "sparkles",
        80,
    ),
    (
        "10000000-0000-4000-8000-000000000009",
        "building-a-habit",
        "Building a Habit",
        "Completed two successful reading weeks in a row.",
        "weekly_streak",
        2,
        "blocks",
        90,
    ),
    (
        "10000000-0000-4000-8000-000000000010",
        "monthly-momentum",
        "Monthly Momentum",
        "Completed four successful reading weeks in a row.",
        "weekly_streak",
        4,
        "trending-up",
        100,
    ),
    (
        "10000000-0000-4000-8000-000000000011",
        "reading-routine",
        "Reading Routine",
        "Completed eight successful reading weeks in a row.",
        "weekly_streak",
        8,
        "repeat",
        110,
    ),
    (
        "10000000-0000-4000-8000-000000000012",
        "season-of-reading",
        "Season of Reading",
        "Completed twelve successful reading weeks in a row.",
        "weekly_streak",
        12,
        "sun",
        120,
    ),
    (
        "10000000-0000-4000-8000-000000000013",
        "three-day-reader",
        "Three-Day Reader",
        "Read for three consecutive days.",
        "continuous_days",
        3,
        "flame",
        130,
    ),
    (
        "10000000-0000-4000-8000-000000000014",
        "one-week-reader",
        "One-Week Reader",
        "Read for seven consecutive days.",
        "continuous_days",
        7,
        "flame",
        140,
    ),
    (
        "10000000-0000-4000-8000-000000000015",
        "two-week-reader",
        "Two-Week Reader",
        "Read for fourteen consecutive days.",
        "continuous_days",
        14,
        "flame",
        150,
    ),
    (
        "10000000-0000-4000-8000-000000000016",
        "monthly-reader",
        "Monthly Reader",
        "Read for thirty consecutive days.",
        "continuous_days",
        30,
        "medal",
        160,
    ),
    (
        "10000000-0000-4000-8000-000000000017",
        "reading-marathon",
        "Reading Marathon",
        "Read for sixty consecutive days.",
        "continuous_days",
        60,
        "award",
        170,
    ),
]


def upgrade() -> None:
    op.create_table(
        "badge_definitions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("threshold", sa.Integer(), nullable=False),
        sa.Column("icon_key", sa.Text(), nullable=False),
        sa.Column("credit_value", sa.Integer(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column(
            "active", sa.Boolean(), server_default=sa.text("true"), nullable=False
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
        sa.CheckConstraint("threshold > 0", name="ck_badge_definitions_threshold"),
        sa.CheckConstraint("credit_value > 0", name="ck_badge_definitions_credit"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_badge_definitions")),
        sa.UniqueConstraint("code", name="uq_badge_definitions_code"),
    )
    op.create_table(
        "reader_badges",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("badge_definition_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("progress_value", sa.Integer(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("revocation_reason", sa.Text()),
        sa.ForeignKeyConstraint(["reader_id"], ["readers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["badge_definition_id"], ["badge_definitions.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reader_badges")),
        sa.UniqueConstraint(
            "reader_id", "badge_definition_id", name="uq_reader_badges_reader_badge"
        ),
    )
    op.create_index("ix_reader_badges_reader_id", "reader_badges", ["reader_id"])
    op.create_table(
        "reader_reward_progress",
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("current_continuous_days", sa.Integer(), nullable=False),
        sa.Column("longest_continuous_days", sa.Integer(), nullable=False),
        sa.Column("current_weekly_streak", sa.Integer(), nullable=False),
        sa.Column("longest_weekly_streak", sa.Integer(), nullable=False),
        sa.Column("current_week_reading_days", sa.Integer(), nullable=False),
        sa.Column("finished_books", sa.Integer(), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["reader_id"], ["readers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("reader_id", name=op.f("pk_reader_reward_progress")),
    )
    op.create_table(
        "reward_items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("credit_cost", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.Text()),
        sa.Column("quantity", sa.Integer()),
        sa.Column(
            "active", sa.Boolean(), server_default=sa.text("true"), nullable=False
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
        sa.CheckConstraint("credit_cost > 0", name="ck_reward_items_credit_cost"),
        sa.CheckConstraint(
            "quantity IS NULL OR quantity >= 0", name="ck_reward_items_quantity"
        ),
        sa.ForeignKeyConstraint(
            ["household_id"], ["households.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reward_items")),
    )
    op.create_index("ix_reward_items_household_id", "reward_items", ["household_id"])
    op.create_table(
        "reward_redemptions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reward_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reward_name", sa.Text(), nullable=False),
        sa.Column("credit_cost", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True)),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        sa.Column("parent_notes", sa.Text()),
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
        sa.ForeignKeyConstraint(["reader_id"], ["readers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["reward_item_id"], ["reward_items.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reward_redemptions")),
    )
    op.create_index(
        "ix_reward_redemptions_reader_id", "reward_redemptions", ["reader_id"]
    )
    op.create_table(
        "reward_transactions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("reader_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("transaction_type", sa.Text(), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True)),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("idempotency_key", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["reader_id"], ["readers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reward_transactions")),
        sa.UniqueConstraint(
            "idempotency_key", name="uq_reward_transactions_idempotency"
        ),
    )
    op.create_index(
        "ix_reward_transactions_reader_id", "reward_transactions", ["reader_id"]
    )

    badge_table = sa.table(
        "badge_definitions",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("code", sa.Text()),
        sa.column("name", sa.Text()),
        sa.column("description", sa.Text()),
        sa.column("category", sa.Text()),
        sa.column("threshold", sa.Integer()),
        sa.column("icon_key", sa.Text()),
        sa.column("credit_value", sa.Integer()),
        sa.column("display_order", sa.Integer()),
        sa.column("active", sa.Boolean()),
    )
    op.bulk_insert(
        badge_table,
        [
            {
                "id": row[0],
                "code": row[1],
                "name": row[2],
                "description": row[3],
                "category": row[4],
                "threshold": row[5],
                "icon_key": row[6],
                "credit_value": 1,
                "display_order": row[7],
                "active": True,
            }
            for row in BADGES
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_reward_transactions_reader_id", table_name="reward_transactions")
    op.drop_table("reward_transactions")
    op.drop_index("ix_reward_redemptions_reader_id", table_name="reward_redemptions")
    op.drop_table("reward_redemptions")
    op.drop_index("ix_reward_items_household_id", table_name="reward_items")
    op.drop_table("reward_items")
    op.drop_table("reader_reward_progress")
    op.drop_index("ix_reader_badges_reader_id", table_name="reader_badges")
    op.drop_table("reader_badges")
    op.drop_table("badge_definitions")
