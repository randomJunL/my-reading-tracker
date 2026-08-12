import uuid

from sqlalchemy.orm import Session

from app.models import Book, ReaderBook, ReadingStatus
from app.repositories.books import BookRepository
from app.repositories.readers import ReaderRepository
from app.schemas.books import BookCreate, BookUpdate, ReaderBookCreate, ReaderBookUpdate


class BookNotFoundError(Exception):
    pass


class ReaderNotFoundError(Exception):
    pass


class ReaderBookConflictError(Exception):
    pass


class ReaderBookNotFoundError(Exception):
    pass


class BookHistoryConflictError(Exception):
    pass


class ReaderBookHistoryConflictError(Exception):
    pass


class BookService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.books = BookRepository(session)
        self.readers = ReaderRepository(session)

    def list(
        self,
        household_id: uuid.UUID,
        *,
        reader_id: uuid.UUID | None = None,
        status: ReadingStatus | None = None,
    ) -> list[Book]:
        if (
            reader_id is not None
            and self.readers.get_for_household(reader_id, household_id) is None
        ):
            raise ReaderNotFoundError
        return self.books.list_for_household(
            household_id, reader_id=reader_id, reading_status=status
        )

    def get(self, book_id: uuid.UUID, household_id: uuid.UUID) -> Book:
        book = self.books.get_for_household(book_id, household_id)
        if book is None:
            raise BookNotFoundError
        return book

    def create(self, household_id: uuid.UUID, data: BookCreate) -> Book:
        book = Book(household_id=household_id, **data.model_dump())
        self.books.add(book)
        self.session.commit()
        self.session.refresh(book)
        return self.get(book.id, household_id)

    def update(
        self, book_id: uuid.UUID, household_id: uuid.UUID, data: BookUpdate
    ) -> Book:
        book = self.get(book_id, household_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(book, field, value)
        self.session.commit()
        self.session.refresh(book)
        return self.get(book.id, household_id)

    def delete(
        self, book_id: uuid.UUID, household_id: uuid.UUID, *, confirm_history: bool
    ) -> None:
        book = self.get(book_id, household_id)
        if self.books.has_reading_sessions(book.id) and not confirm_history:
            raise BookHistoryConflictError
        self.books.delete_book(book)
        self.session.commit()

    def add_to_reader(
        self, reader_id: uuid.UUID, household_id: uuid.UUID, data: ReaderBookCreate
    ) -> ReaderBook:
        if self.readers.get_for_household(reader_id, household_id) is None:
            raise ReaderNotFoundError
        self.get(data.book_id, household_id)
        if self.books.get_assignment(reader_id, data.book_id):
            raise ReaderBookConflictError
        assignment = ReaderBook(reader_id=reader_id, **data.model_dump())
        self.books.add(assignment)
        self.session.commit()
        self.session.refresh(assignment)
        return assignment

    def update_assignment(
        self,
        reader_id: uuid.UUID,
        book_id: uuid.UUID,
        household_id: uuid.UUID,
        data: ReaderBookUpdate,
    ) -> ReaderBook:
        if self.readers.get_for_household(reader_id, household_id) is None:
            raise ReaderNotFoundError
        self.get(book_id, household_id)
        assignment = self.books.get_assignment(reader_id, book_id)
        if assignment is None:
            raise ReaderBookNotFoundError
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(assignment, field, value)
        self.session.commit()
        self.session.refresh(assignment)
        return assignment

    def remove_assignment(
        self, reader_id: uuid.UUID, book_id: uuid.UUID, household_id: uuid.UUID
    ) -> None:
        if self.readers.get_for_household(reader_id, household_id) is None:
            raise ReaderNotFoundError
        self.get(book_id, household_id)
        assignment = self.books.get_assignment(reader_id, book_id)
        if assignment is None:
            raise ReaderBookNotFoundError
        if self.books.has_reader_history(reader_id, book_id):
            raise ReaderBookHistoryConflictError
        self.books.delete_assignment(assignment)
        self.session.commit()
