import uuid
from typing import Annotated, Protocol

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.services.households import HouseholdContext, get_or_create_household


class HouseholdOwned(Protocol):
    household_id: uuid.UUID


def get_household_context(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> HouseholdContext:
    return get_or_create_household(session, user)


def require_household_access(record: HouseholdOwned, context: HouseholdContext) -> None:
    if record.household_id != context.household.id:
        # Avoid confirming that another household's identifier exists.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )


def require_admin(context: HouseholdContext) -> None:
    if not context.is_admin:
        raise HTTPException(status_code=403, detail="Admin access is required")


def require_reader_access(reader_id: uuid.UUID, context: HouseholdContext) -> None:
    if not context.is_admin and context.reader_id != reader_id:
        raise HTTPException(
            status_code=403, detail="You can only access your own profile"
        )
