from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.household import get_household_context, require_admin
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.schemas.auth import CurrentUserResponse, CurrentUserUpdate
from app.services.households import HouseholdContext

router = APIRouter()


@router.get("/me", response_model=CurrentUserResponse)
def get_me(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    context: Annotated[HouseholdContext, Depends(get_household_context)],
) -> CurrentUserResponse:
    return _response(user, context)


@router.patch("/me", response_model=CurrentUserResponse)
def update_me(
    data: CurrentUserUpdate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> CurrentUserResponse:
    require_admin(context)
    context.household.name = data.household_name
    session.commit()
    session.refresh(context.household)
    return _response(user, context)


def _response(
    user: AuthenticatedUser, context: HouseholdContext
) -> CurrentUserResponse:
    return CurrentUserResponse(
        user_id=user.id,
        email=user.email,
        household_id=context.household.id,
        household_name=context.household.name,
        role=context.membership.role,
        reader_id=context.reader_id,
        is_admin=context.is_admin,
    )
