import uuid
from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from app.models import ReadingSession, ReadingStatus
from app.repositories.books import BookRepository
from app.repositories.readers import ReaderRepository
from app.repositories.reading_sessions import ReadingSessionRepository
from app.schemas.reports import (
    CalendarDay,
    CalendarReportResponse,
    CurrentBookProgress,
    ReportSession,
    ReportSummaryResponse,
)


class ReportReaderNotFoundError(Exception):
    pass


class ReportService:
    def __init__(self, session: Session) -> None:
        self.readers = ReaderRepository(session)
        self.books = BookRepository(session)
        self.sessions = ReadingSessionRepository(session)

    def summary(
        self,
        household_id: uuid.UUID,
        reader_id: uuid.UUID,
        date_from: date,
        date_to: date,
    ) -> ReportSummaryResponse:
        self._require_reader(reader_id, household_id)
        period_sessions = self.sessions.list_for_household(
            household_id,
            reader_id=reader_id,
            date_from=date_from,
            date_to=date_to,
        )
        all_sessions = self.sessions.list_for_household(
            household_id, reader_id=reader_id
        )
        finished_books = {
            record.book_id for record in period_sessions if record.finished_book
        }

        return ReportSummaryResponse(
            reader_id=reader_id,
            date_from=date_from,
            date_to=date_to,
            total_minutes=sum(record.minutes for record in period_sessions),
            pages_read=sum(_pages_read(record) for record in period_sessions),
            books_finished=len(finished_books),
            reading_days=len({record.session_date for record in period_sessions}),
            sessions_count=len(period_sessions),
            current_books=self._current_books(household_id, reader_id, all_sessions),
            recent_activity=[_session_response(record) for record in all_sessions[:5]],
        )

    def calendar(
        self,
        household_id: uuid.UUID,
        reader_id: uuid.UUID,
        date_from: date,
        date_to: date,
    ) -> CalendarReportResponse:
        self._require_reader(reader_id, household_id)
        sessions = self.sessions.list_for_household(
            household_id,
            reader_id=reader_id,
            date_from=date_from,
            date_to=date_to,
        )
        by_day: dict[date, list[ReadingSession]] = defaultdict(list)
        for record in sessions:
            by_day[record.session_date].append(record)

        days = []
        for session_date in sorted(by_day):
            records = by_day[session_date]
            days.append(
                CalendarDay(
                    date=session_date,
                    minutes=sum(record.minutes for record in records),
                    pages_read=sum(_pages_read(record) for record in records),
                    sessions_count=len(records),
                    books_finished=len(
                        {record.book_id for record in records if record.finished_book}
                    ),
                )
            )
        return CalendarReportResponse(
            reader_id=reader_id,
            date_from=date_from,
            date_to=date_to,
            days=days,
        )

    def _require_reader(self, reader_id: uuid.UUID, household_id: uuid.UUID) -> None:
        if self.readers.get_for_household(reader_id, household_id) is None:
            raise ReportReaderNotFoundError

    def _current_books(
        self,
        household_id: uuid.UUID,
        reader_id: uuid.UUID,
        sessions: list[ReadingSession],
    ) -> list[CurrentBookProgress]:
        books = self.books.list_for_household(
            household_id,
            reader_id=reader_id,
            reading_status=ReadingStatus.READING,
        )
        last_pages: dict[uuid.UUID, int] = {}
        for record in sessions:
            if record.end_page is not None:
                last_pages[record.book_id] = max(
                    last_pages.get(record.book_id, 0), record.end_page
                )

        results = []
        for book in books:
            assignment = next(
                item for item in book.reader_books if item.reader_id == reader_id
            )
            last_page = last_pages.get(book.id)
            progress_percent = None
            if last_page is not None and book.page_count:
                progress_percent = round(min(last_page / book.page_count * 100, 100), 1)
            results.append(
                CurrentBookProgress(
                    book_id=book.id,
                    title=book.title,
                    cover_url=book.cover_url,
                    page_count=book.page_count,
                    last_page=last_page,
                    progress_percent=progress_percent,
                    status=assignment.status,
                )
            )
        return results


def _pages_read(record: ReadingSession) -> int:
    if record.start_page is None or record.end_page is None:
        return 0
    return max(record.end_page - record.start_page, 0)


def _session_response(record: ReadingSession) -> ReportSession:
    return ReportSession(
        id=record.id,
        book_id=record.book_id,
        book_title=record.book.title,
        book_cover_url=record.book.cover_url,
        session_date=record.session_date,
        minutes=record.minutes,
        pages_read=_pages_read(record),
        activity_type=record.activity_type,
        finished_book=record.finished_book,
        created_at=record.created_at,
    )
