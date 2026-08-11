from dataclasses import dataclass
from typing import Protocol

from app.schemas.book_search import BookSearchResult


class BookProviderUnavailableError(Exception):
    """Raised when a provider cannot complete a search safely."""


@dataclass(frozen=True)
class BookSearchQuery:
    text: str | None = None
    title: str | None = None
    author: str | None = None
    isbn: str | None = None

    @property
    def cache_key(self) -> str:
        parts = (self.text, self.title, self.author, self.isbn)
        return "|".join((part or "").casefold() for part in parts)


class BookProvider(Protocol):
    name: str

    async def search(
        self, query: BookSearchQuery, *, limit: int
    ) -> list[BookSearchResult]: ...
