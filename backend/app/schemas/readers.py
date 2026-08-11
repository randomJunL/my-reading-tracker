import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

ReaderName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=80),
]
AvatarKey = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=40,
        pattern=r"^[a-z0-9_-]+$",
    ),
]


class ReaderCreate(BaseModel):
    name: ReaderName
    avatar_key: AvatarKey | None = None


class ReaderUpdate(BaseModel):
    name: ReaderName | None = None
    avatar_key: AvatarKey | None = None

    @model_validator(mode="after")
    def validate_changes(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Reader name cannot be null")
        return self


class ReaderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    avatar_key: str | None
    created_at: datetime
    updated_at: datetime
