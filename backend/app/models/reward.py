import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class BadgeCategory(StrEnum):
    BOOKS_FINISHED = "books_finished"
    WEEKLY_CONSISTENCY = "weekly_consistency"
    WEEKLY_STREAK = "weekly_streak"
    CONTINUOUS_DAYS = "continuous_days"


class RewardTransactionType(StrEnum):
    READING_SESSION = "reading_session"
    BADGE_AWARD = "badge_award"
    BONUS = "bonus"
    REDEMPTION = "redemption"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"


class RedemptionStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class BadgeDefinition(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "badge_definitions"
    __table_args__ = (
        UniqueConstraint("code", name="uq_badge_definitions_code"),
        CheckConstraint("threshold > 0", name="ck_badge_definitions_threshold"),
        CheckConstraint("credit_value >= 0", name="ck_badge_definitions_credit"),
    )

    code: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    icon_key: Mapped[str] = mapped_column(Text, nullable=False)
    credit_value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ReaderBadge(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "reader_badges"
    __table_args__ = (
        UniqueConstraint(
            "reader_id", "badge_definition_id", name="uq_reader_badges_reader_badge"
        ),
        Index("ix_reader_badges_reader_id", "reader_id"),
    )

    reader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("readers.id", ondelete="CASCADE")
    )
    badge_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("badge_definitions.id", ondelete="RESTRICT")
    )
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    progress_value: Mapped[int] = mapped_column(Integer, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revocation_reason: Mapped[str | None] = mapped_column(Text)

    badge: Mapped[BadgeDefinition] = relationship()


class ReaderRewardProgress(Base):
    __tablename__ = "reader_reward_progress"

    reader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("readers.id", ondelete="CASCADE"),
        primary_key=True,
    )
    current_continuous_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    longest_continuous_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    current_weekly_streak: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    longest_weekly_streak: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    current_week_reading_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    finished_books: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class RewardItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reward_items"
    __table_args__ = (
        CheckConstraint("credit_cost > 0", name="ck_reward_items_credit_cost"),
        CheckConstraint(
            "quantity IS NULL OR quantity >= 0", name="ck_reward_items_quantity"
        ),
        Index("ix_reward_items_household_id", "household_id"),
    )

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    credit_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[int | None] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class RewardRedemption(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reward_redemptions"
    __table_args__ = (Index("ix_reward_redemptions_reader_id", "reader_id"),)

    reader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("readers.id", ondelete="CASCADE")
    )
    reward_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reward_items.id", ondelete="RESTRICT")
    )
    reward_name: Mapped[str] = mapped_column(Text, nullable=False)
    credit_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    parent_notes: Mapped[str | None] = mapped_column(Text)


class RewardTransaction(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "reward_transactions"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_reward_transactions_idempotency"),
        Index("ix_reward_transactions_reader_id", "reader_id"),
    )

    reader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("readers.id", ondelete="CASCADE")
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
