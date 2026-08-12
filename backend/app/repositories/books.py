import uuid

from sqlalchemy import delete, exists, select
from sqlalchemy.orm import Session, selectinload

from app.models import Book, ReaderBook, ReadingSession, ReadingStatus


class BookRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_for_household(
        self,
        household_id: uuid.UUID,
        *,
        reader_id: uuid.UUID | None = None,
        reading_status: ReadingStatus | None = None,
    ) -> list[Book]:
        statement = (
            select(Book)
            .options(selectinload(Book.reader_books))
            .where(Book.household_id == household_id)
        )
        if reader_id is not None:
            statement = statement.join(ReaderBook).where(
                ReaderBook.reader_id == reader_id
            )
            if reading_status is not None:
                statement = statement.where(ReaderBook.status == reading_status)
        return list(
            self.session.scalars(statement.order_by(Book.created_at.desc())).unique()
        )

    def get_for_household(
        self, book_id: uuid.UUID, household_id: uuid.UUID
    ) -> Book | None:
        return self.session.scalar(
            select(Book)
            .options(selectinload(Book.reader_books))
            .where(Book.id == book_id, Book.household_id == household_id)
        )

    def get_assignment(
        self, reader_id: uuid.UUID, book_id: uuid.UUID
    ) -> ReaderBook | None:
        return self.session.scalar(
            select(ReaderBook).where(
                ReaderBook.reader_id == reader_id, ReaderBook.book_id == book_id
            )
        )

    def has_reading_sessions(self, book_id: uuid.UUID) -> bool:
        return bool(
            self.session.scalar(
                select(exists().where(ReadingSession.book_id == book_id))
            )
        )

    def add(self, record: Book | ReaderBook) -> None:
        self.session.add(record)

    def delete_book(self, book: Book) -> None:
        self.session.execute(delete(Book).where(Book.id == book.id))

    def delete_assignment(self, assignment: ReaderBook) -> None:
        self.session.execute(delete(ReaderBook).where(ReaderBook.id == assignment.id))
