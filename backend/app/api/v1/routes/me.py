from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.household import get_household_context
from app.core.security import AuthenticatedUser
from app.schemas.auth import CurrentUserResponse
from app.services.households import HouseholdContext

router = APIRouter()


@router.get("/me", response_model=CurrentUserResponse)
def get_me(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    context: Annotated[HouseholdContext, Depends(get_household_context)],
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
