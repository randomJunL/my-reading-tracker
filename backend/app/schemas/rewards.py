import uuid
from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

RewardName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]


class BadgeProgress(BaseModel):
    badge_id: uuid.UUID
    code: str
    name: str
    description: str
    category: str
    threshold: int
    current_value: int
    earned: bool
    earned_at: datetime | None
    progress_percent: float
    credit_value: int


class RewardProgressResponse(BaseModel):
    reader_id: uuid.UUID
    credit_balance: int
    finished_books: int
    current_week_reading_days: int
    current_weekly_streak: int
    longest_weekly_streak: int
    current_continuous_days: int
    longest_continuous_days: int
    badges: list[BadgeProgress]


class RewardItemCreate(BaseModel):
    name: RewardName
    description: str | None = Field(default=None, max_length=1000)
    credit_cost: int = Field(gt=0, le=1000)
    image_url: str | None = Field(default=None, max_length=2000)
    quantity: int | None = Field(default=None, ge=0, le=10000)
    active: bool = True


class RewardItemUpdate(BaseModel):
    name: RewardName | None = None
    description: str | None = Field(default=None, max_length=1000)
    credit_cost: int | None = Field(default=None, gt=0, le=1000)
    image_url: str | None = Field(default=None, max_length=2000)
    quantity: int | None = Field(default=None, ge=0, le=10000)
    active: bool | None = None

    @model_validator(mode="after")
    def require_change(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        for field in ("name", "credit_cost", "active"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class RewardItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    description: str | None
    credit_cost: int
    image_url: str | None
    quantity: int | None
    active: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class RedemptionCreate(BaseModel):
    reader_id: uuid.UUID
    reward_item_id: uuid.UUID


class RedemptionAction(BaseModel):
    status: Literal["approved", "rejected", "fulfilled", "cancelled"]
    parent_notes: str | None = Field(default=None, max_length=1000)


class RedemptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reader_id: uuid.UUID
    reward_item_id: uuid.UUID
    reward_name: str
    credit_cost: int
    status: str
    requested_at: datetime
    approved_at: datetime | None
    fulfilled_at: datetime | None
    cancelled_at: datetime | None
    parent_notes: str | None
    created_at: datetime
    updated_at: datetime


class RewardTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reader_id: uuid.UUID
    amount: int
    transaction_type: str
    source_id: uuid.UUID | None
    description: str
    created_at: datetime
