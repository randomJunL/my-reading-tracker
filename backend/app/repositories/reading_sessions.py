import uuid
from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.models import ActivityType, Reader, ReadingSession


class ReadingSessionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_for_household(
        self,
        household_id: uuid.UUID,
        *,
        reader_id: uuid.UUID | None = None,
        book_id: uuid.UUID | None = None,
        activity_type: ActivityType | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[ReadingSession]:
        statement = (
            select(ReadingSession)
            .join(Reader)
            .options(joinedload(ReadingSession.book))
            .where(Reader.household_id == household_id)
        )
        if reader_id is not None:
            statement = statement.where(ReadingSession.reader_id == reader_id)
        if book_id is not None:
            statement = statement.where(ReadingSession.book_id == book_id)
        if activity_type is not None:
            statement = statement.where(ReadingSession.activity_type == activity_type)
        if date_from is not None:
            statement = statement.where(ReadingSession.session_date >= date_from)
        if date_to is not None:
            statement = statement.where(ReadingSession.session_date <= date_to)
        return list(
            self.session.scalars(
                statement.order_by(
                    ReadingSession.session_date.desc(),
                    ReadingSession.created_at.desc(),
                )
            )
        )

    def get_for_household(
        self, session_id: uuid.UUID, household_id: uuid.UUID
    ) -> ReadingSession | None:
        return self.session.scalar(
            select(ReadingSession)
            .join(Reader)
            .options(joinedload(ReadingSession.book))
            .where(
                ReadingSession.id == session_id,
                Reader.household_id == household_id,
            )
        )

    def add(self, reading_session: ReadingSession) -> None:
        self.session.add(reading_session)

    def delete(self, reading_session: ReadingSession) -> None:
        self.session.execute(
            delete(ReadingSession).where(ReadingSession.id == reading_session.id)
        )
