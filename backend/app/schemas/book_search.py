from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models import MetadataSource

SearchText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=2, max_length=200),
]


class BookSearchParameters(BaseModel):
    q: SearchText | None = None
    title: SearchText | None = None
    author: SearchText | None = None
    limit: int = Field(default=10, ge=1, le=20)


class BookSearchResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    source: MetadataSource
    external_source_id: str
    title: str
    subtitle: str | None = None
    authors: list[str] = Field(default_factory=list)
    isbn_10: str | None = None
    isbn_13: str | None = None
    cover_url: str | None = None
    publisher: str | None = None
    published_date: str | None = None
    page_count: int | None = None
    description: str | None = None
    language: str | None = None
