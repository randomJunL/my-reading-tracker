import uuid
from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.book import Book
    from app.models.book_recommendation import BookRecommendation
    from app.models.reader import Reader


class HouseholdRole(StrEnum):
    OWNER = "owner"
    CAREGIVER = "caregiver"


class Household(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "households"

    name: Mapped[str] = mapped_column(Text, nullable=False)

    members: Mapped[list["HouseholdMember"]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )
    readers: Mapped[list["Reader"]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )
    books: Mapped[list["Book"]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["BookRecommendation"]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )


class HouseholdMember(Base):
    __tablename__ = "household_members"
    __table_args__ = (
        CheckConstraint(
            "role IN ('owner', 'caregiver')", name="ck_household_members_role"
        ),
    )

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("households.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    role: Mapped[HouseholdRole] = mapped_column(
        Enum(
            HouseholdRole,
            native_enum=False,
            create_constraint=False,
            values_callable=lambda choices: [choice.value for choice in choices],
            length=9,
        ),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    household: Mapped[Household] = relationship(back_populates="members")
