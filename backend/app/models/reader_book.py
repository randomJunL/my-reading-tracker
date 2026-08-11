import uuid
from datetime import date
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.book import Book
    from app.models.reader import Reader


class ReadingStatus(StrEnum):
    PLANNED = "planned"
    READING = "reading"
    FINISHED = "finished"


class ReaderBook(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reader_books"
    __table_args__ = (
        CheckConstraint(
            "status IN ('planned', 'reading', 'finished')",
            name="ck_reader_books_status",
        ),
        CheckConstraint(
            "finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at",
            name="ck_reader_books_date_order",
        ),
        UniqueConstraint("reader_id", "book_id", name="uq_reader_books_reader_book"),
        Index("ix_reader_books_book_id", "book_id"),
    )

    reader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("readers.id", ondelete="CASCADE")
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE")
    )
    status: Mapped[ReadingStatus] = mapped_column(
        Enum(
            ReadingStatus,
            native_enum=False,
            create_constraint=False,
            values_callable=lambda choices: [choice.value for choice in choices],
            length=8,
        ),
        nullable=False,
    )
    started_at: Mapped[date | None] = mapped_column(Date)
    finished_at: Mapped[date | None] = mapped_column(Date)

    reader: Mapped["Reader"] = relationship(back_populates="reader_books")
    book: Mapped["Book"] = relationship(back_populates="reader_books")
