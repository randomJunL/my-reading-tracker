import uuid
from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload

from app.core.security import AuthenticatedUser
from app.models import Household, HouseholdMember, HouseholdRole


@dataclass(frozen=True)
class HouseholdContext:
    household: Household
    membership: HouseholdMember


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

    household = Household(name="My Household")
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
