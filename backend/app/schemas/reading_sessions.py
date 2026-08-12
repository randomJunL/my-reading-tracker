import uuid
from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import ActivityType


class ReadingSessionCreate(BaseModel):
    reader_id: uuid.UUID
    book_id: uuid.UUID
    session_date: date
    minutes: int = Field(gt=0, le=1440)
    start_page: int | None = Field(default=None, ge=0)
    end_page: int | None = Field(default=None, ge=0)
    activity_type: ActivityType
    notes: str | None = Field(default=None, max_length=2000)
    finished_book: bool = False

    @model_validator(mode="after")
    def validate_page_order(self) -> Self:
        _validate_pages(self.start_page, self.end_page)
        return self


class ReadingSessionUpdate(BaseModel):
    session_date: date | None = None
    minutes: int | None = Field(default=None, gt=0, le=1440)
    start_page: int | None = Field(default=None, ge=0)
    end_page: int | None = Field(default=None, ge=0)
    activity_type: ActivityType | None = None
    notes: str | None = Field(default=None, max_length=2000)
    finished_book: bool | None = None

    @model_validator(mode="after")
    def require_change(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        for field in ("session_date", "minutes", "activity_type", "finished_book"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class ReadingSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reader_id: uuid.UUID
    book_id: uuid.UUID
    book_title: str
    book_cover_url: str | None
    session_date: date
    minutes: int
    start_page: int | None
    end_page: int | None
    activity_type: ActivityType
    notes: str | None
    finished_book: bool
    created_at: datetime
    updated_at: datetime


def _validate_pages(start_page: int | None, end_page: int | None) -> None:
    if start_page is not None and end_page is not None and end_page < start_page:
        raise ValueError("End page cannot be before start page")
