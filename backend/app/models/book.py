import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, CheckConstraint, Enum, ForeignKey, Index, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.book_recommendation import BookRecommendation
    from app.models.household import Household
    from app.models.reader_book import ReaderBook
    from app.models.reading_session import ReadingSession


class MetadataSource(StrEnum):
    MANUAL = "manual"
    GOOGLE_BOOKS = "google_books"
    OPEN_LIBRARY = "open_library"


class Book(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "books"
    __table_args__ = (
        CheckConstraint("page_count > 0", name="ck_books_page_count_positive"),
        CheckConstraint(
            "metadata_source IN ('manual', 'google_books', 'open_library')",
            name="ck_books_metadata_source",
        ),
        Index("ix_books_household_id", "household_id"),
    )

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text)
    authors: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    isbn_10: Mapped[str | None] = mapped_column(Text)
    isbn_13: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)
    publisher: Mapped[str | None] = mapped_column(Text)
    published_date: Mapped[str | None] = mapped_column(Text)
    page_count: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str | None] = mapped_column(Text)
    metadata_source: Mapped[MetadataSource] = mapped_column(
        Enum(
            MetadataSource,
            native_enum=False,
            create_constraint=False,
            values_callable=lambda choices: [choice.value for choice in choices],
            length=12,
        ),
        nullable=False,
    )
    external_source_id: Mapped[str | None] = mapped_column(Text)

    household: Mapped["Household"] = relationship(back_populates="books")
    reader_books: Mapped[list["ReaderBook"]] = relationship(
        back_populates="book", cascade="all, delete-orphan"
    )
    reading_sessions: Mapped[list["ReadingSession"]] = relationship(
        back_populates="book", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["BookRecommendation"]] = relationship(
        back_populates="book", cascade="all, delete-orphan"
    )
