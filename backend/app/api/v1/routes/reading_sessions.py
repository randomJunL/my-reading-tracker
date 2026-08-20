import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.household import get_household_context, require_reader_access
from app.database.session import get_db
from app.models import ActivityType, ReadingSession
from app.schemas.reading_sessions import (
    ReadingSessionCreate,
    ReadingSessionResponse,
    ReadingSessionUpdate,
)
from app.services.households import HouseholdContext
from app.services.reading_sessions import (
    ReadingSessionLibraryConflictError,
    ReadingSessionNotFoundError,
    ReadingSessionPageRangeError,
    ReadingSessionService,
)

router = APIRouter(prefix="/reading-sessions")


@router.get("", response_model=list[ReadingSessionResponse])
def list_reading_sessions(
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
    reader_id: uuid.UUID | None = None,
    book_id: uuid.UUID | None = None,
    activity_type: ActivityType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[ReadingSessionResponse]:
    if context.reader_id is not None:
        if reader_id is not None:
            require_reader_access(reader_id, context)
        reader_id = context.reader_id
    if date_from and date_to and date_to < date_from:
        raise HTTPException(
            status_code=422, detail="date_to cannot be before date_from"
        )
    try:
        records = ReadingSessionService(session).list(
            context.household.id,
            reader_id=reader_id,
            book_id=book_id,
            activity_type=activity_type,
            date_from=date_from,
            date_to=date_to,
        )
    except ReadingSessionNotFoundError as error:
        raise _not_found() from error
    return [_response(record) for record in records]


@router.post(
    "", response_model=ReadingSessionResponse, status_code=status.HTTP_201_CREATED
)
def create_reading_session(
    data: ReadingSessionCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReadingSessionResponse:
    require_reader_access(data.reader_id, context)
    try:
        record = ReadingSessionService(session).create(context.household.id, data)
    except ReadingSessionNotFoundError as error:
        raise _not_found() from error
    except ReadingSessionLibraryConflictError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Add this book to the reader's library before logging it",
        ) from error
    return _response(record)


@router.get("/{session_id}", response_model=ReadingSessionResponse)
def get_reading_session(
    session_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReadingSessionResponse:
    try:
        record = ReadingSessionService(session).get(session_id, context.household.id)
        require_reader_access(record.reader_id, context)
        return _response(record)
    except ReadingSessionNotFoundError as error:
        raise _not_found() from error


@router.patch("/{session_id}", response_model=ReadingSessionResponse)
def update_reading_session(
    session_id: uuid.UUID,
    data: ReadingSessionUpdate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReadingSessionResponse:
    try:
        service = ReadingSessionService(session)
        existing = service.get(session_id, context.household.id)
        require_reader_access(existing.reader_id, context)
        record = service.update(session_id, context.household.id, data)
    except ReadingSessionNotFoundError as error:
        raise _not_found() from error
    except ReadingSessionPageRangeError as error:
        raise HTTPException(
            status_code=422, detail="End page cannot be before start page"
        ) from error
    return _response(record)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reading_session(
    session_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        service = ReadingSessionService(session)
        record = service.get(session_id, context.household.id)
        require_reader_access(record.reader_id, context)
        service.delete(session_id, context.household.id)
    except ReadingSessionNotFoundError as error:
        raise _not_found() from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _response(record: ReadingSession) -> ReadingSessionResponse:
    return ReadingSessionResponse(
        id=record.id,
        reader_id=record.reader_id,
        book_id=record.book_id,
        book_title=record.book.title,
        book_cover_url=record.book.cover_url,
        session_date=record.session_date,
        minutes=record.minutes,
        start_page=record.start_page,
        end_page=record.end_page,
        activity_type=record.activity_type,
        notes=record.notes,
        finished_book=record.finished_book,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Reading session not found")
