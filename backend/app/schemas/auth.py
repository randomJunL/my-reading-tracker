import uuid
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.models import HouseholdRole


class CurrentUserResponse(BaseModel):
    user_id: uuid.UUID
    email: str
    household_id: uuid.UUID
    household_name: str
    role: HouseholdRole
    reader_id: uuid.UUID | None
    is_admin: bool


class CurrentUserUpdate(BaseModel):
    household_name: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
    ]


class ReaderLoginInvitationCreate(BaseModel):
    email: str


class ReaderLoginInvitationResponse(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID | None
    email: str
    accepted: bool
