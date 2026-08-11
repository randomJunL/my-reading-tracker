import uuid

from pydantic import BaseModel

from app.models import HouseholdRole


class CurrentUserResponse(BaseModel):
    user_id: uuid.UUID
    email: str
    household_id: uuid.UUID
    household_name: str
    role: HouseholdRole
