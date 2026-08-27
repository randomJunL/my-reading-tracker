import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth_admin import get_supabase_auth_admin
from app.api.dependencies.household import get_household_context, require_admin
from app.database.session import get_db
from app.integrations.auth.supabase_admin import InvitationEmailError, SupabaseAuthAdmin
from app.schemas.auth import ReaderLoginInvitationCreate, ReaderLoginInvitationResponse
from app.services.households import (
    HouseholdContext,
    ReaderLoginInvitationConflictError,
    ReaderLoginInvitationNotFoundError,
    create_reader_login_invitation,
    delete_reader_login_invitation,
    list_reader_login_invitations,
)

router = APIRouter(prefix="/reader-login-invitations")


@router.get("", response_model=list[ReaderLoginInvitationResponse])
def list_invitations(
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> list[ReaderLoginInvitationResponse]:
    require_admin(context)
    return [
        ReaderLoginInvitationResponse(
            id=item.id,
            reader_id=item.reader_id,
            email=item.email,
            accepted=item.accepted_at is not None,
        )
        for item in list_reader_login_invitations(session, context.household.id)
    ]


@router.post(
    "",
    response_model=ReaderLoginInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invitation(
    data: ReaderLoginInvitationCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
    auth_admin: Annotated[SupabaseAuthAdmin, Depends(get_supabase_auth_admin)],
) -> ReaderLoginInvitationResponse:
    require_admin(context)
    try:
        item = create_reader_login_invitation(session, context.household.id, data.email)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ReaderLoginInvitationConflictError as error:
        raise HTTPException(
            status_code=409, detail="That email already has a reader invitation"
        ) from error
    try:
        auth_admin.invite_reader(item.email)
    except InvitationEmailError as error:
        delete_reader_login_invitation(session, context.household.id, item.id)
        raise HTTPException(
            status_code=502,
            detail=(
                "The invitation email could not be sent. Check the Supabase "
                "Auth email and SMTP configuration, then try again."
            ),
        ) from error
    return ReaderLoginInvitationResponse(
        id=item.id,
        reader_id=item.reader_id,
        email=item.email,
        accepted=False,
    )


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invitation(
    invitation_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    require_admin(context)
    try:
        delete_reader_login_invitation(session, context.household.id, invitation_id)
    except ReaderLoginInvitationNotFoundError as error:
        raise HTTPException(status_code=404, detail="Login access not found") from error
    return Response(status_code=204)
