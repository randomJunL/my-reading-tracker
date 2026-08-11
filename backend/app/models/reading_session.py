import uuid
from datetime import date
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.book import Book
    from app.models.reader import Reader


class ActivityType(StrEnum):
    INDEPENDENT = "independent"
    WITH_ADULT = "with_adult"
    READ_ALOUD = "read_aloud"
    AUDIOBOOK = "audiobook"


class ReadingSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reading_sessions"
    __table_args__ = (
        CheckConstraint("minutes > 0", name="ck_reading_sessions_minutes_positive"),
        CheckConstraint(
            "start_page IS NULL OR start_page >= 0",
            name="ck_reading_sessions_start_page_nonnegative",
        ),
        CheckConstraint(
            "end_page IS NULL OR end_page >= 0",
            name="ck_reading_sessions_end_page_nonnegative",
        ),
        CheckConstraint(
            "start_page IS NULL OR end_page IS NULL OR end_page >= start_page",
            name="ck_reading_sessions_page_order",
        ),
        CheckConstraint(
            "activity_type IN ('independent', 'with_adult', 'read_aloud', 'audiobook')",
            name="ck_reading_sessions_activity_type",
        ),
        Index("ix_reading_sessions_reader_date", "reader_id", "session_date"),
        Index("ix_reading_sessions_book_id", "book_id"),
    )

    reader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("readers.id", ondelete="CASCADE")
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE")
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    start_page: Mapped[int | None] = mapped_column(Integer)
    end_page: Mapped[int | None] = mapped_column(Integer)
    activity_type: Mapped[ActivityType] = mapped_column(
        Enum(
            ActivityType,
            native_enum=False,
            create_constraint=False,
            values_callable=lambda choices: [choice.value for choice in choices],
            length=11,
        ),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    finished_book: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    reader: Mapped["Reader"] = relationship(back_populates="reading_sessions")
    book: Mapped["Book"] = relationship(back_populates="reading_sessions")
