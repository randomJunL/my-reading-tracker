import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.household import (
    get_household_context,
    require_admin,
    require_reader_access,
)
from app.database.session import get_db
from app.models import BookRecommendation, ReadingStatus
from app.schemas.books import (
    BookCreate,
    BookResponse,
    BookUpdate,
    ReaderBookCreate,
    ReaderBookResponse,
    ReaderBookUpdate,
)
from app.services.books import (
    BookHistoryConflictError,
    BookNotFoundError,
    BookService,
    ReaderBookConflictError,
    ReaderBookHistoryConflictError,
    ReaderBookNotFoundError,
    ReaderNotFoundError,
)
from app.services.households import HouseholdContext

router = APIRouter()


@router.get("/books", response_model=list[BookResponse])
def list_books(
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
    reader_id: uuid.UUID | None = None,
    reading_status: Annotated[ReadingStatus | None, Query(alias="status")] = None,
) -> list[BookResponse]:
    if context.reader_id is not None:
        if reader_id is not None:
            require_reader_access(reader_id, context)
        reader_id = context.reader_id
    if reading_status is not None and reader_id is None:
        raise HTTPException(status_code=422, detail="status requires reader_id")
    try:
        books = BookService(session).list(
            context.household.id, reader_id=reader_id, status=reading_status
        )
    except ReaderNotFoundError as error:
        raise _not_found("Reader") from error
    return [BookResponse.model_validate(book) for book in books]


@router.post("/books", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
def create_book(
    data: BookCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> BookResponse:
    require_admin(context)
    return BookResponse.model_validate(
        BookService(session).create(context.household.id, data)
    )


@router.get("/books/{book_id}", response_model=BookResponse)
def get_book(
    book_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> BookResponse:
    try:
        book = BookService(session).get(book_id, context.household.id)
        if context.reader_id is not None and not any(
            item.reader_id == context.reader_id for item in book.reader_books
        ):
            raise BookNotFoundError
        return BookResponse.model_validate(book)
    except BookNotFoundError as error:
        raise _not_found("Book") from error


@router.patch("/books/{book_id}", response_model=BookResponse)
def update_book(
    book_id: uuid.UUID,
    data: BookUpdate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> BookResponse:
    require_admin(context)
    try:
        return BookResponse.model_validate(
            BookService(session).update(book_id, context.household.id, data)
        )
    except BookNotFoundError as error:
        raise _not_found("Book") from error


@router.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
    confirm_history: bool = False,
) -> Response:
    require_admin(context)
    try:
        BookService(session).delete(
            book_id, context.household.id, confirm_history=confirm_history
        )
    except BookNotFoundError as error:
        raise _not_found("Book") from error
    except BookHistoryConflictError as error:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "book_has_history",
                "message": (
                    "This book has reading history. Confirm deletion to continue."
                ),
            },
        ) from error
    return Response(status_code=204)


@router.post(
    "/readers/{reader_id}/books",
    response_model=ReaderBookResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_book_to_reader(
    reader_id: uuid.UUID,
    data: ReaderBookCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReaderBookResponse:
    require_reader_access(reader_id, context)
    if context.reader_id is not None:
        recommended = session.scalar(
            select(BookRecommendation.id).where(
                BookRecommendation.household_id == context.household.id,
                BookRecommendation.book_id == data.book_id,
            )
        )
        if recommended is None:
            raise HTTPException(
                status_code=403,
                detail="Readers can only add books from recommendations",
            )
    try:
        assignment = BookService(session).add_to_reader(
            reader_id, context.household.id, data
        )
    except (ReaderNotFoundError, BookNotFoundError) as error:
        raise _not_found("Reader or book") from error
    except ReaderBookConflictError as error:
        raise HTTPException(
            status_code=409, detail="Book is already in this reader's library"
        ) from error
    return ReaderBookResponse.model_validate(assignment)


@router.patch("/readers/{reader_id}/books/{book_id}", response_model=ReaderBookResponse)
def update_reader_book(
    reader_id: uuid.UUID,
    book_id: uuid.UUID,
    data: ReaderBookUpdate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReaderBookResponse:
    require_reader_access(reader_id, context)
    try:
        assignment = BookService(session).update_assignment(
            reader_id, book_id, context.household.id, data
        )
    except (ReaderNotFoundError, BookNotFoundError, ReaderBookNotFoundError) as error:
        raise _not_found("Reader book") from error
    return ReaderBookResponse.model_validate(assignment)


@router.delete(
    "/readers/{reader_id}/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_reader_book(
    reader_id: uuid.UUID,
    book_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    require_reader_access(reader_id, context)
    try:
        BookService(session).remove_assignment(reader_id, book_id, context.household.id)
    except (ReaderNotFoundError, BookNotFoundError, ReaderBookNotFoundError) as error:
        raise _not_found("Reader book") from error
    except ReaderBookHistoryConflictError as error:
        raise HTTPException(
            status_code=409,
            detail=(
                "This book has reading history for the reader. "
                "Delete those sessions before removing it from the library."
            ),
        ) from error
    return Response(status_code=204)


def _not_found(resource: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{resource} not found")
