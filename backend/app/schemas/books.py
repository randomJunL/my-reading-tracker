import uuid
from datetime import date, datetime
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.models import MetadataSource, ReadingStatus

RequiredText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)
]
OptionalText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]


class BookFields(BaseModel):
    title: RequiredText
    subtitle: OptionalText | None = None
    authors: list[str] = Field(default_factory=list, max_length=20)
    isbn_10: str | None = Field(default=None, max_length=20)
    isbn_13: str | None = Field(default=None, max_length=20)
    cover_url: str | None = Field(default=None, max_length=2000)
    publisher: str | None = Field(default=None, max_length=300)
    published_date: str | None = Field(default=None, max_length=40)
    page_count: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=10_000)
    language: str | None = Field(default=None, max_length=20)
    metadata_source: MetadataSource = MetadataSource.MANUAL
    external_source_id: str | None = Field(default=None, max_length=300)

    @field_validator("authors")
    @classmethod
    def clean_authors(cls, authors: list[str]) -> list[str]:
        return [author.strip() for author in authors if author.strip()]


class BookCreate(BookFields):
    pass


class BookUpdate(BaseModel):
    title: RequiredText | None = None
    subtitle: OptionalText | None = None
    authors: list[str] | None = Field(default=None, max_length=20)
    isbn_10: str | None = Field(default=None, max_length=20)
    isbn_13: str | None = Field(default=None, max_length=20)
    cover_url: str | None = Field(default=None, max_length=2000)
    publisher: str | None = Field(default=None, max_length=300)
    published_date: str | None = Field(default=None, max_length=40)
    page_count: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=10_000)
    language: str | None = Field(default=None, max_length=20)

    @field_validator("authors")
    @classmethod
    def clean_authors(cls, authors: list[str] | None) -> list[str] | None:
        if authors is None:
            return None
        return [author.strip() for author in authors if author.strip()]

    @model_validator(mode="after")
    def require_change(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Book title cannot be null")
        if "authors" in self.model_fields_set and self.authors is None:
            raise ValueError("Authors cannot be null")
        return self


class ReaderBookCreate(BaseModel):
    book_id: uuid.UUID
    status: ReadingStatus = ReadingStatus.PLANNED
    started_at: date | None = None
    finished_at: date | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.started_at and self.finished_at and self.finished_at < self.started_at:
            raise ValueError("Finished date cannot be before started date")
        return self


class ReaderBookUpdate(BaseModel):
    status: ReadingStatus | None = None
    started_at: date | None = None
    finished_at: date | None = None

    @model_validator(mode="after")
    def validate_change(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        return self


class ReaderBookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reader_id: uuid.UUID
    book_id: uuid.UUID
    status: ReadingStatus
    started_at: date | None
    finished_at: date | None
    created_at: datetime
    updated_at: datetime


class BookResponse(BookFields):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    reader_books: list[ReaderBookResponse] = Field(default_factory=list)
