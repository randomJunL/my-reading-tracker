import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.household import get_household_context
from app.database.session import get_db
from app.schemas.readers import ReaderCreate, ReaderResponse, ReaderUpdate
from app.services.households import HouseholdContext
from app.services.readers import (
    ReaderHistoryConflictError,
    ReaderNotFoundError,
    ReaderService,
)

router = APIRouter(prefix="/readers")


@router.get("", response_model=list[ReaderResponse])
def list_readers(
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> list[ReaderResponse]:
    readers = ReaderService(session).list(context.household.id)
    return [ReaderResponse.model_validate(reader) for reader in readers]


@router.post("", response_model=ReaderResponse, status_code=status.HTTP_201_CREATED)
def create_reader(
    data: ReaderCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReaderResponse:
    reader = ReaderService(session).create(context.household.id, data)
    return ReaderResponse.model_validate(reader)


@router.get("/{reader_id}", response_model=ReaderResponse)
def get_reader(
    reader_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReaderResponse:
    try:
        reader = ReaderService(session).get(reader_id, context.household.id)
    except ReaderNotFoundError as error:
        raise _not_found() from error
    return ReaderResponse.model_validate(reader)


@router.patch("/{reader_id}", response_model=ReaderResponse)
def update_reader(
    reader_id: uuid.UUID,
    data: ReaderUpdate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReaderResponse:
    try:
        reader = ReaderService(session).update(reader_id, context.household.id, data)
    except ReaderNotFoundError as error:
        raise _not_found() from error
    return ReaderResponse.model_validate(reader)


@router.delete("/{reader_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reader(
    reader_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
    confirm_history: Annotated[bool, Query()] = False,
) -> Response:
    try:
        ReaderService(session).delete(
            reader_id,
            context.household.id,
            confirm_history=confirm_history,
        )
    except ReaderNotFoundError as error:
        raise _not_found() from error
    except ReaderHistoryConflictError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "reader_has_history",
                "message": (
                    "This reader has books or reading history. "
                    "Confirm deletion to continue."
                ),
            },
        ) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Reader not found",
    )
