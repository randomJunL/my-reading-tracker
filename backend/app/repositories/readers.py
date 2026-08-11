import uuid

from sqlalchemy import delete, exists, select
from sqlalchemy.orm import Session

from app.models import Reader, ReaderBook, ReadingSession


class ReaderRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_for_household(self, household_id: uuid.UUID) -> list[Reader]:
        return list(
            self.session.scalars(
                select(Reader)
                .where(Reader.household_id == household_id)
                .order_by(Reader.created_at, Reader.name)
            )
        )

    def get_for_household(
        self, reader_id: uuid.UUID, household_id: uuid.UUID
    ) -> Reader | None:
        return self.session.scalar(
            select(Reader).where(
                Reader.id == reader_id,
                Reader.household_id == household_id,
            )
        )

    def add(self, reader: Reader) -> None:
        self.session.add(reader)

    def has_history(self, reader_id: uuid.UUID) -> bool:
        return bool(
            self.session.scalar(
                select(
                    exists().where(ReaderBook.reader_id == reader_id)
                    | exists().where(ReadingSession.reader_id == reader_id)
                )
            )
        )

    def delete(self, reader: Reader) -> None:
        # Let the database cascade related library/history rows atomically.
        self.session.execute(delete(Reader).where(Reader.id == reader.id))
