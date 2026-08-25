import uuid

from pydantic import BaseModel

from app.models import HouseholdRole


class CurrentUserResponse(BaseModel):
    user_id: uuid.UUID
    email: str
    household_id: uuid.UUID
    household_name: str
    role: HouseholdRole
    reader_id: uuid.UUID | None
    is_admin: bool


class ReaderLoginInvitationCreate(BaseModel):
    reader_id: uuid.UUID
    email: str


class ReaderLoginInvitationResponse(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID
    email: str
    accepted: bool


class CaregiverLoginInvitationCreate(BaseModel):
    email: str


class CaregiverLoginInvitationResponse(BaseModel):
    id: uuid.UUID
    email: str
    accepted: bool
