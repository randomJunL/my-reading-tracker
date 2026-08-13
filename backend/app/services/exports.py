import csv
import uuid
from datetime import UTC, datetime
from io import StringIO
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    BadgeDefinition,
    Book,
    Household,
    Reader,
    ReaderBadge,
    ReaderBook,
    ReadingSession,
    ReadingStatus,
    RewardItem,
    RewardRedemption,
    RewardTransaction,
)
from app.schemas.exports import (
    ExportBadgeDefinition,
    ExportBook,
    ExportReader,
    ExportReaderBadge,
    ExportReaderBook,
    ExportReadingSession,
    ExportRewardItem,
    ExportRewardRedemption,
    ExportRewardTransaction,
    ReadingDataExport,
)


class ExportService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def json_export(self, household: Household) -> ReadingDataExport:
        readers = list(
            self.session.scalars(
                select(Reader)
                .where(Reader.household_id == household.id)
                .order_by(Reader.created_at, Reader.id)
            )
        )
        books = list(
            self.session.scalars(
                select(Book)
                .where(Book.household_id == household.id)
                .order_by(Book.created_at, Book.id)
            )
        )
        reader_ids = [reader.id for reader in readers]
        reader_books = self._reader_books(reader_ids)
        sessions = self._sessions(reader_ids)
        badge_definitions = list(
            self.session.scalars(
                select(BadgeDefinition).order_by(BadgeDefinition.display_order)
            )
        )
        reader_badges = self._for_readers(ReaderBadge, reader_ids)
        reward_transactions = self._for_readers(RewardTransaction, reader_ids)
        reward_redemptions = self._for_readers(RewardRedemption, reader_ids)
        reward_items = list(
            self.session.scalars(
                select(RewardItem)
                .where(RewardItem.household_id == household.id)
                .order_by(RewardItem.created_at, RewardItem.id)
            )
        )
        return ReadingDataExport(
            exported_at=datetime.now(UTC),
            household_id=household.id,
            household_name=household.name,
            readers=[
                ExportReader.model_validate(item, from_attributes=True)
                for item in readers
            ],
            books=[
                ExportBook.model_validate(item, from_attributes=True) for item in books
            ],
            reader_books=[
                ExportReaderBook.model_validate(item, from_attributes=True)
                for item in reader_books
            ],
            reading_sessions=[
                ExportReadingSession.model_validate(item, from_attributes=True)
                for item in sessions
            ],
            badge_definitions=[
                ExportBadgeDefinition.model_validate(item, from_attributes=True)
                for item in badge_definitions
            ],
            reader_badges=[
                ExportReaderBadge.model_validate(item, from_attributes=True)
                for item in reader_badges
            ],
            reward_items=[
                ExportRewardItem.model_validate(item, from_attributes=True)
                for item in reward_items
            ],
            reward_transactions=[
                ExportRewardTransaction.model_validate(item, from_attributes=True)
                for item in reward_transactions
            ],
            reward_redemptions=[
                ExportRewardRedemption.model_validate(item, from_attributes=True)
                for item in reward_redemptions
            ],
        )

    def csv_export(self, household: Household) -> str:
        rows = self.session.execute(
            select(ReadingSession, Reader.name, Book.title, Book.authors)
            .join(Reader, ReadingSession.reader_id == Reader.id)
            .join(Book, ReadingSession.book_id == Book.id)
            .where(Reader.household_id == household.id)
            .order_by(
                ReadingSession.session_date,
                ReadingSession.created_at,
                ReadingSession.id,
            )
        ).all()
        output = StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(
            [
                "Date",
                "Reader",
                "Book",
                "Authors",
                "Minutes",
                "Start page",
                "End page",
                "Pages read",
                "Activity",
                "Finished book",
                "Notes",
            ]
        )
        for record, reader_name, book_title, authors in rows:
            writer.writerow(
                [
                    record.session_date.isoformat(),
                    _safe_csv_text(reader_name),
                    _safe_csv_text(book_title),
                    _safe_csv_text("; ".join(authors)),
                    record.minutes,
                    record.start_page if record.start_page is not None else "",
                    record.end_page if record.end_page is not None else "",
                    _pages_read(record),
                    record.activity_type.value.replace("_", " ").title(),
                    "Yes" if record.finished_book else "No",
                    _safe_csv_text(record.notes or ""),
                ]
            )
        return output.getvalue()

    def finished_books_csv_export(self, household: Household) -> str:
        finished_books = self.session.execute(
            select(ReaderBook, Reader.name, Book)
            .join(Reader, ReaderBook.reader_id == Reader.id)
            .join(Book, ReaderBook.book_id == Book.id)
            .where(
                Reader.household_id == household.id,
                ReaderBook.status == ReadingStatus.FINISHED,
            )
            .order_by(ReaderBook.finished_at, Reader.name, Book.title)
        ).all()
        sessions_by_pair: dict[tuple[uuid.UUID, uuid.UUID], list[ReadingSession]] = {}
        reader_ids = list({assignment.reader_id for assignment, _, _ in finished_books})
        for record in self._sessions(reader_ids):
            sessions_by_pair.setdefault((record.reader_id, record.book_id), []).append(
                record
            )

        output = StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(
            [
                "Reader",
                "Book",
                "Authors",
                "Finished date",
                "Started date",
                "First reading date",
                "Last reading date",
                "Total reading minutes",
                "Total pages read",
                "Reading sessions",
                "Book page count",
                "ISBN-13",
            ]
        )
        for assignment, reader_name, book in finished_books:
            sessions = sessions_by_pair.get(
                (assignment.reader_id, assignment.book_id), []
            )
            dates = [record.session_date for record in sessions]
            writer.writerow(
                [
                    _safe_csv_text(reader_name),
                    _safe_csv_text(book.title),
                    _safe_csv_text("; ".join(book.authors)),
                    assignment.finished_at.isoformat()
                    if assignment.finished_at
                    else "",
                    assignment.started_at.isoformat() if assignment.started_at else "",
                    min(dates).isoformat() if dates else "",
                    max(dates).isoformat() if dates else "",
                    sum(record.minutes for record in sessions),
                    sum(_pages_read(record) for record in sessions),
                    len(sessions),
                    book.page_count or "",
                    _safe_csv_text(book.isbn_13 or ""),
                ]
            )
        return output.getvalue()

    def _reader_books(self, reader_ids: list[uuid.UUID]) -> list[ReaderBook]:
        if not reader_ids:
            return []
        return list(
            self.session.scalars(
                select(ReaderBook)
                .where(ReaderBook.reader_id.in_(reader_ids))
                .order_by(ReaderBook.created_at, ReaderBook.id)
            )
        )

    def _sessions(self, reader_ids: list[uuid.UUID]) -> list[ReadingSession]:
        if not reader_ids:
            return []
        return list(
            self.session.scalars(
                select(ReadingSession)
                .where(ReadingSession.reader_id.in_(reader_ids))
                .order_by(
                    ReadingSession.session_date,
                    ReadingSession.created_at,
                    ReadingSession.id,
                )
            )
        )

    def _for_readers(self, model: Any, reader_ids: list[uuid.UUID]) -> list[Any]:
        if not reader_ids:
            return []
        return list(
            self.session.scalars(
                select(model)
                .where(model.reader_id.in_(reader_ids))
                .order_by(model.reader_id, model.id)
            )
        )


def _pages_read(record: ReadingSession) -> int:
    if record.start_page is None or record.end_page is None:
        return 0
    return max(record.end_page - record.start_page, 0)


def _safe_csv_text(value: str) -> str:
    if value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{value}"
    return value
