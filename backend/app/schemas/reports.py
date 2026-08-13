import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models import ActivityType, ReadingStatus


class ReportSession(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    book_title: str
    book_cover_url: str | None
    session_date: date
    minutes: int
    pages_read: int
    activity_type: ActivityType
    finished_book: bool
    created_at: datetime


class CurrentBookProgress(BaseModel):
    book_id: uuid.UUID
    title: str
    cover_url: str | None
    page_count: int | None
    last_page: int | None
    progress_percent: float | None
    status: ReadingStatus


class ReportSummaryResponse(BaseModel):
    reader_id: uuid.UUID
    date_from: date
    date_to: date
    total_minutes: int
    pages_read: int
    books_finished: int
    reading_days: int
    sessions_count: int
    current_books: list[CurrentBookProgress]
    recent_activity: list[ReportSession]


class CalendarDay(BaseModel):
    date: date
    minutes: int
    pages_read: int
    sessions_count: int
    books_finished: int


class CalendarReportResponse(BaseModel):
    reader_id: uuid.UUID
    date_from: date
    date_to: date
    days: list[CalendarDay]
