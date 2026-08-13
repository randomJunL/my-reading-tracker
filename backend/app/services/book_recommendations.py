import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Book, BookRecommendation, MetadataSource
from app.schemas.book_recommendations import BookRecommendationCreate


class BookRecommendationConflictError(Exception):
    pass


class BookRecommendationNotFoundError(Exception):
    pass


class BookRecommendationService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, household_id: uuid.UUID) -> list[BookRecommendation]:
        return list(
            self.session.scalars(
                select(BookRecommendation)
                .options(
                    selectinload(BookRecommendation.book).selectinload(
                        Book.reader_books
                    )
                )
                .where(BookRecommendation.household_id == household_id)
                .order_by(BookRecommendation.created_at.desc())
            )
        )

    def create(
        self, household_id: uuid.UUID, data: BookRecommendationCreate
    ) -> BookRecommendation:
        book = self._find_matching_book(household_id, data)
        if book is None:
            book = Book(household_id=household_id, **data.book.model_dump())
            self.session.add(book)
            self.session.flush()

        existing = self.session.scalar(
            select(BookRecommendation).where(
                BookRecommendation.household_id == household_id,
                BookRecommendation.book_id == book.id,
            )
        )
        if existing is not None:
            raise BookRecommendationConflictError

        recommendation = BookRecommendation(
            household_id=household_id,
            book_id=book.id,
            note=data.note.strip() if data.note and data.note.strip() else None,
        )
        self.session.add(recommendation)
        self.session.commit()
        return self.get(recommendation.id, household_id)

    def get(
        self, recommendation_id: uuid.UUID, household_id: uuid.UUID
    ) -> BookRecommendation:
        recommendation = self.session.scalar(
            select(BookRecommendation)
            .options(
                selectinload(BookRecommendation.book).selectinload(Book.reader_books)
            )
            .where(
                BookRecommendation.id == recommendation_id,
                BookRecommendation.household_id == household_id,
            )
        )
        if recommendation is None:
            raise BookRecommendationNotFoundError
        return recommendation

    def delete(self, recommendation_id: uuid.UUID, household_id: uuid.UUID) -> None:
        recommendation = self.get(recommendation_id, household_id)
        self.session.delete(recommendation)
        self.session.commit()

    def _find_matching_book(
        self, household_id: uuid.UUID, data: BookRecommendationCreate
    ) -> Book | None:
        book_data = data.book
        if (
            book_data.metadata_source != MetadataSource.MANUAL
            and book_data.external_source_id
        ):
            match = self.session.scalar(
                select(Book).where(
                    Book.household_id == household_id,
                    Book.metadata_source == book_data.metadata_source,
                    Book.external_source_id == book_data.external_source_id,
                )
            )
            if match is not None:
                return match

        for field, value in (
            (Book.isbn_13, book_data.isbn_13),
            (Book.isbn_10, book_data.isbn_10),
        ):
            if value:
                match = self.session.scalar(
                    select(Book).where(
                        Book.household_id == household_id, field == value
                    )
                )
                if match is not None:
                    return match
        return None
