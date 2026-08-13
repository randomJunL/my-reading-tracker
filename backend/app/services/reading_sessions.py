import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models import ActivityType, ReaderBook, ReadingSession, ReadingStatus
from app.repositories.books import BookRepository
from app.repositories.readers import ReaderRepository
from app.repositories.reading_sessions import ReadingSessionRepository
from app.schemas.reading_sessions import ReadingSessionCreate, ReadingSessionUpdate
from app.services.rewards import RewardService


class ReadingSessionNotFoundError(Exception):
    pass


class ReadingSessionLibraryConflictError(Exception):
    pass


class ReadingSessionPageRangeError(Exception):
    pass


class ReadingSessionService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.sessions = ReadingSessionRepository(session)
        self.readers = ReaderRepository(session)
        self.books = BookRepository(session)

    def list(
        self,
        household_id: uuid.UUID,
        *,
        reader_id: uuid.UUID | None = None,
        book_id: uuid.UUID | None = None,
        activity_type: ActivityType | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[ReadingSession]:
        if reader_id and not self.readers.get_for_household(reader_id, household_id):
            raise ReadingSessionNotFoundError
        if book_id and not self.books.get_for_household(book_id, household_id):
            raise ReadingSessionNotFoundError
        return self.sessions.list_for_household(
            household_id,
            reader_id=reader_id,
            book_id=book_id,
            activity_type=activity_type,
            date_from=date_from,
            date_to=date_to,
        )

    def get(self, session_id: uuid.UUID, household_id: uuid.UUID) -> ReadingSession:
        record = self.sessions.get_for_household(session_id, household_id)
        if record is None:
            raise ReadingSessionNotFoundError
        return record

    def create(
        self, household_id: uuid.UUID, data: ReadingSessionCreate
    ) -> ReadingSession:
        assignment = self._get_assignment(data.reader_id, data.book_id, household_id)
        record = ReadingSession(**data.model_dump())
        self.sessions.add(record)
        self._sync_status(assignment, record)
        self.session.commit()
        RewardService(self.session).evaluate(data.reader_id, household_id)
        return self.get(record.id, household_id)

    def update(
        self,
        session_id: uuid.UUID,
        household_id: uuid.UUID,
        data: ReadingSessionUpdate,
    ) -> ReadingSession:
        record = self.get(session_id, household_id)
        changes = data.model_dump(exclude_unset=True)
        start_page = changes.get("start_page", record.start_page)
        end_page = changes.get("end_page", record.end_page)
        if start_page is not None and end_page is not None and end_page < start_page:
            raise ReadingSessionPageRangeError
        for field, value in changes.items():
            setattr(record, field, value)
        assignment = self._get_assignment(
            record.reader_id, record.book_id, household_id
        )
        self._sync_status(assignment, record)
        self.session.commit()
        RewardService(self.session).evaluate(record.reader_id, household_id)
        return self.get(record.id, household_id)

    def delete(self, session_id: uuid.UUID, household_id: uuid.UUID) -> None:
        record = self.get(session_id, household_id)
        reader_id = record.reader_id
        self.sessions.delete(record)
        self.session.commit()
        RewardService(self.session).evaluate(reader_id, household_id)

    def _get_assignment(
        self, reader_id: uuid.UUID, book_id: uuid.UUID, household_id: uuid.UUID
    ) -> ReaderBook:
        reader = self.readers.get_for_household(reader_id, household_id)
        book = self.books.get_for_household(book_id, household_id)
        assignment = self.books.get_assignment(reader_id, book_id)
        if reader is None or book is None:
            raise ReadingSessionNotFoundError
        if assignment is None:
            raise ReadingSessionLibraryConflictError
        return assignment

    @staticmethod
    def _sync_status(assignment: ReaderBook, record: ReadingSession) -> None:
        if record.finished_book:
            assignment.status = ReadingStatus.FINISHED
            assignment.finished_at = record.session_date
            if assignment.started_at is None:
                assignment.started_at = record.session_date
        elif assignment.status is ReadingStatus.PLANNED:
            assignment.status = ReadingStatus.READING
            assignment.started_at = assignment.started_at or record.session_date
