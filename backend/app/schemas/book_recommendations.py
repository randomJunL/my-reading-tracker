import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.books import BookCreate, BookResponse


class BookRecommendationCreate(BaseModel):
    book: BookCreate
    note: str | None = Field(default=None, max_length=1000)


class BookRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    book_id: uuid.UUID
    note: str | None
    created_at: datetime
    updated_at: datetime
    book: BookResponse
