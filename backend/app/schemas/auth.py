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
    email: str


class ReaderLoginInvitationResponse(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID | None
    email: str
    accepted: bool
