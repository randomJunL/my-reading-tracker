import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.household import get_household_context, require_admin
from app.database.session import get_db
from app.schemas.auth import (
    CaregiverLoginInvitationCreate,
    CaregiverLoginInvitationResponse,
    ReaderLoginInvitationCreate,
    ReaderLoginInvitationResponse,
)
from app.services.households import (
    HouseholdContext,
    LoginInvitationConflictError,
    LoginInvitationNotFoundError,
    ReaderLoginInvitationConflictError,
    ReaderLoginInvitationNotFoundError,
    create_caregiver_login_invitation,
    create_reader_login_invitation,
    delete_caregiver_login_invitation,
    delete_reader_login_invitation,
    list_caregiver_login_invitations,
    list_reader_login_invitations,
)

router = APIRouter(prefix="/reader-login-invitations")
caregiver_router = APIRouter(prefix="/caregiver-login-invitations")


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
) -> ReaderLoginInvitationResponse:
    require_admin(context)
    try:
        item = create_reader_login_invitation(
            session, context.household.id, data.reader_id, data.email
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ReaderLoginInvitationNotFoundError as error:
        raise HTTPException(status_code=404, detail="Reader not found") from error
    except ReaderLoginInvitationConflictError as error:
        raise HTTPException(
            status_code=409, detail="That reader or email already has login access"
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


@caregiver_router.get("", response_model=list[CaregiverLoginInvitationResponse])
def list_caregiver_invitations(
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> list[CaregiverLoginInvitationResponse]:
    require_admin(context)
    return [
        CaregiverLoginInvitationResponse(
            id=item.id, email=item.email, accepted=item.accepted_at is not None
        )
        for item in list_caregiver_login_invitations(session, context.household.id)
    ]


@caregiver_router.post(
    "",
    response_model=CaregiverLoginInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_caregiver_invitation(
    data: CaregiverLoginInvitationCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> CaregiverLoginInvitationResponse:
    require_admin(context)
    try:
        item = create_caregiver_login_invitation(
            session, context.household.id, data.email
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except LoginInvitationConflictError as error:
        raise HTTPException(
            status_code=409, detail="That email already has login access"
        ) from error
    return CaregiverLoginInvitationResponse(
        id=item.id, email=item.email, accepted=False
    )


@caregiver_router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_caregiver_invitation(
    invitation_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    require_admin(context)
    try:
        delete_caregiver_login_invitation(session, context.household.id, invitation_id)
    except LoginInvitationNotFoundError as error:
        raise HTTPException(status_code=404, detail="Login access not found") from error
    return Response(status_code=204)
