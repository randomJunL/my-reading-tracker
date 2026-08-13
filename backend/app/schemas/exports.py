import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models import ActivityType, MetadataSource, ReadingStatus


class ExportReader(BaseModel):
    id: uuid.UUID
    name: str
    avatar_key: str | None
    created_at: datetime
    updated_at: datetime


class ExportBook(BaseModel):
    id: uuid.UUID
    title: str
    subtitle: str | None
    authors: list[str]
    isbn_10: str | None
    isbn_13: str | None
    cover_url: str | None
    publisher: str | None
    published_date: str | None
    page_count: int | None
    description: str | None
    language: str | None
    metadata_source: MetadataSource
    external_source_id: str | None
    created_at: datetime
    updated_at: datetime


class ExportReaderBook(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID
    book_id: uuid.UUID
    status: ReadingStatus
    started_at: date | None
    finished_at: date | None
    created_at: datetime
    updated_at: datetime


class ExportReadingSession(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID
    book_id: uuid.UUID
    session_date: date
    minutes: int
    start_page: int | None
    end_page: int | None
    activity_type: ActivityType
    notes: str | None
    finished_book: bool
    created_at: datetime
    updated_at: datetime


class ReadingDataExport(BaseModel):
    schema_version: int = 1
    exported_at: datetime
    household_id: uuid.UUID
    household_name: str
    readers: list[ExportReader]
    books: list[ExportBook]
    reader_books: list[ExportReaderBook]
    reading_sessions: list[ExportReadingSession]
