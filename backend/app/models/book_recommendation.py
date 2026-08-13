import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.book import Book
    from app.models.household import Household


class BookRecommendation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "book_recommendations"
    __table_args__ = (
        UniqueConstraint(
            "household_id", "book_id", name="uq_book_recommendations_household_book"
        ),
        Index("ix_book_recommendations_household_id", "household_id"),
    )

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE")
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE")
    )
    note: Mapped[str | None] = mapped_column(Text)

    household: Mapped["Household"] = relationship(back_populates="recommendations")
    book: Mapped["Book"] = relationship(back_populates="recommendations")
