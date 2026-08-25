import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, joinedload

from app.core.security import AuthenticatedUser
from app.models import (
    CaregiverLoginInvitation,
    Household,
    HouseholdMember,
    HouseholdRole,
    Reader,
    ReaderLoginInvitation,
)


@dataclass(frozen=True)
class HouseholdContext:
    household: Household
    membership: HouseholdMember

    @property
    def is_admin(self) -> bool:
        return self.membership.role in {
            HouseholdRole.OWNER,
            HouseholdRole.CAREGIVER,
        }

    @property
    def reader_id(self) -> uuid.UUID | None:
        return self.membership.reader_id


def get_or_create_household(
    session: Session, user: AuthenticatedUser
) -> HouseholdContext:
    membership = _find_membership(session, user.id)
    if membership is not None:
        return HouseholdContext(membership.household, membership)

    # Serializes concurrent first requests for the same user without requiring a
    # global lock or exposing the Supabase user table to this database.
    session.execute(
        text("SELECT pg_advisory_xact_lock(:lock_key)"),
        {"lock_key": _advisory_lock_key(user.id)},
    )
    membership = _find_membership(session, user.id)
    if membership is not None:
        session.commit()
        return HouseholdContext(membership.household, membership)

    invitation = session.scalar(
        select(ReaderLoginInvitation).where(
            func.lower(ReaderLoginInvitation.email) == user.email.strip().lower(),
            ReaderLoginInvitation.accepted_at.is_(None),
        )
    )
    if invitation is not None:
        membership = HouseholdMember(
            household_id=invitation.household_id,
            user_id=user.id,
            role=HouseholdRole.READER,
            reader_id=invitation.reader_id,
        )
        invitation.accepted_user_id = user.id
        invitation.accepted_at = datetime.now(UTC)
        session.add(membership)
        session.commit()
        household = session.get(Household, invitation.household_id)
        if household is None:
            raise ReaderLoginInvitationNotFoundError
        return HouseholdContext(household, membership)

    caregiver_invitation = session.scalar(
        select(CaregiverLoginInvitation).where(
            func.lower(CaregiverLoginInvitation.email) == user.email.strip().lower(),
            CaregiverLoginInvitation.accepted_at.is_(None),
        )
    )
    if caregiver_invitation is not None:
        membership = HouseholdMember(
            household_id=caregiver_invitation.household_id,
            user_id=user.id,
            role=HouseholdRole.CAREGIVER,
        )
        caregiver_invitation.accepted_user_id = user.id
        caregiver_invitation.accepted_at = datetime.now(UTC)
        session.add(membership)
        session.commit()
        household = session.get(Household, caregiver_invitation.household_id)
        if household is None:
            raise LoginInvitationNotFoundError
        return HouseholdContext(household, membership)

    if user.account_type in {"reader", "caregiver"}:
        raise LoginInvitationRequiredError

    household = Household(name=user.household_name or "My Household")
    membership = HouseholdMember(
        household=household,
        user_id=user.id,
        role=HouseholdRole.OWNER,
    )
    session.add(membership)
    session.commit()
    return HouseholdContext(household, membership)


def _find_membership(session: Session, user_id: uuid.UUID) -> HouseholdMember | None:
    return session.scalar(
        select(HouseholdMember)
        .options(joinedload(HouseholdMember.household))
        .where(HouseholdMember.user_id == user_id)
        .order_by(HouseholdMember.created_at)
        .limit(1)
    )


def _advisory_lock_key(user_id: uuid.UUID) -> int:
    return int.from_bytes(user_id.bytes[:8], byteorder="big", signed=True)


class ReaderLoginInvitationConflictError(Exception):
    pass


class ReaderLoginInvitationNotFoundError(Exception):
    pass


class LoginInvitationRequiredError(Exception):
    pass


class LoginInvitationConflictError(Exception):
    pass


class LoginInvitationNotFoundError(Exception):
    pass


def list_reader_login_invitations(
    session: Session, household_id: uuid.UUID
) -> list[ReaderLoginInvitation]:
    return list(
        session.scalars(
            select(ReaderLoginInvitation)
            .where(ReaderLoginInvitation.household_id == household_id)
            .order_by(ReaderLoginInvitation.created_at)
        )
    )


def create_reader_login_invitation(
    session: Session,
    household_id: uuid.UUID,
    reader_id: uuid.UUID,
    email: str,
) -> ReaderLoginInvitation:
    normalized_email = email.strip().lower()
    if "@" not in normalized_email:
        raise ValueError("Enter a valid email address")
    reader = session.scalar(
        select(Reader.id).where(
            Reader.id == reader_id, Reader.household_id == household_id
        )
    )
    existing = session.scalar(
        select(ReaderLoginInvitation).where(
            (ReaderLoginInvitation.reader_id == reader_id)
            | (func.lower(ReaderLoginInvitation.email) == normalized_email)
        )
    )
    caregiver_existing = session.scalar(
        select(CaregiverLoginInvitation).where(
            func.lower(CaregiverLoginInvitation.email) == normalized_email
        )
    )
    if reader is None:
        raise ReaderLoginInvitationNotFoundError
    if existing is not None or caregiver_existing is not None:
        raise ReaderLoginInvitationConflictError
    invitation = ReaderLoginInvitation(
        household_id=household_id, reader_id=reader_id, email=normalized_email
    )
    session.add(invitation)
    session.commit()
    session.refresh(invitation)
    return invitation


def delete_reader_login_invitation(
    session: Session, household_id: uuid.UUID, invitation_id: uuid.UUID
) -> None:
    invitation = session.scalar(
        select(ReaderLoginInvitation).where(
            ReaderLoginInvitation.id == invitation_id,
            ReaderLoginInvitation.household_id == household_id,
        )
    )
    if invitation is None:
        raise ReaderLoginInvitationNotFoundError
    if invitation.accepted_user_id is not None:
        membership = session.scalar(
            select(HouseholdMember).where(
                HouseholdMember.user_id == invitation.accepted_user_id,
                HouseholdMember.household_id == household_id,
            )
        )
        if membership is not None:
            session.delete(membership)
    session.delete(invitation)
    session.commit()


def list_caregiver_login_invitations(
    session: Session, household_id: uuid.UUID
) -> list[CaregiverLoginInvitation]:
    return list(
        session.scalars(
            select(CaregiverLoginInvitation)
            .where(CaregiverLoginInvitation.household_id == household_id)
            .order_by(CaregiverLoginInvitation.created_at)
        )
    )


def create_caregiver_login_invitation(
    session: Session, household_id: uuid.UUID, email: str
) -> CaregiverLoginInvitation:
    normalized_email = email.strip().lower()
    if "@" not in normalized_email:
        raise ValueError("Enter a valid email address")
    existing_caregiver = session.scalar(
        select(CaregiverLoginInvitation).where(
            func.lower(CaregiverLoginInvitation.email) == normalized_email
        )
    )
    existing_reader = session.scalar(
        select(ReaderLoginInvitation).where(
            func.lower(ReaderLoginInvitation.email) == normalized_email
        )
    )
    if existing_caregiver is not None or existing_reader is not None:
        raise LoginInvitationConflictError
    invitation = CaregiverLoginInvitation(
        household_id=household_id, email=normalized_email
    )
    session.add(invitation)
    session.commit()
    session.refresh(invitation)
    return invitation


def delete_caregiver_login_invitation(
    session: Session, household_id: uuid.UUID, invitation_id: uuid.UUID
) -> None:
    invitation = session.scalar(
        select(CaregiverLoginInvitation).where(
            CaregiverLoginInvitation.id == invitation_id,
            CaregiverLoginInvitation.household_id == household_id,
        )
    )
    if invitation is None:
        raise LoginInvitationNotFoundError
    if invitation.accepted_user_id is not None:
        membership = session.scalar(
            select(HouseholdMember).where(
                HouseholdMember.user_id == invitation.accepted_user_id,
                HouseholdMember.household_id == household_id,
            )
        )
        if membership is not None:
            session.delete(membership)
    session.delete(invitation)
    session.commit()
