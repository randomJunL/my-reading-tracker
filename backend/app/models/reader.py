import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.household import Household
    from app.models.reader_book import ReaderBook
    from app.models.reading_session import ReadingSession


class Reader(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "readers"
    __table_args__ = (Index("ix_readers_household_id", "household_id"),)

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_key: Mapped[str | None] = mapped_column(Text)

    household: Mapped["Household"] = relationship(back_populates="readers")
    reader_books: Mapped[list["ReaderBook"]] = relationship(
        back_populates="reader", cascade="all, delete-orphan"
    )
    reading_sessions: Mapped[list["ReadingSession"]] = relationship(
        back_populates="reader", cascade="all, delete-orphan"
    )
