from typing import Any

import httpx

from app.integrations.books.base import (
    BookProviderUnavailableError,
    BookSearchQuery,
)
from app.integrations.books.http import get_json
from app.models import MetadataSource
from app.schemas.book_search import BookSearchResult


class GoogleBooksProvider:
    name = "google_books"
    search_url = "https://www.googleapis.com/books/v1/volumes"

    def __init__(
        self,
        client: httpx.AsyncClient,
        *,
        api_key: str,
        max_retries: int,
    ) -> None:
        self.client = client
        self.api_key = api_key
        self.max_retries = max_retries

    async def search(
        self, query: BookSearchQuery, *, limit: int
    ) -> list[BookSearchResult]:
        if not self.api_key:
            raise BookProviderUnavailableError(self.name)

        params: dict[str, str | int] = {
            "q": _google_query(query),
            "maxResults": limit,
            "orderBy": "relevance",
            "printType": "books",
            "projection": "full",
            "key": self.api_key,
        }
        payload = await get_json(
            self.client,
            self.search_url,
            params=params,
            provider_name=self.name,
            max_retries=self.max_retries,
        )
        items = payload.get("items")
        if not isinstance(items, list):
            return []

        results: list[BookSearchResult] = []
        for item in items:
            result = _normalize_volume(item)
            if result is not None:
                results.append(result)
        return results[:limit]


def _google_query(query: BookSearchQuery) -> str:
    if query.isbn:
        return f"isbn:{query.isbn}"
    parts: list[str] = []
    if query.text:
        parts.append(query.text)
    if query.title:
        parts.append(f'intitle:"{query.title}"')
    if query.author:
        parts.append(f'inauthor:"{query.author}"')
    return " ".join(parts)


def _normalize_volume(value: Any) -> BookSearchResult | None:
    item = _dict(value)
    volume_id = _string(item.get("id"))
    info = _dict(item.get("volumeInfo"))
    title = _string(info.get("title"))
    if not volume_id or not title:
        return None

    isbn_10: str | None = None
    isbn_13: str | None = None
    identifiers = info.get("industryIdentifiers")
    if isinstance(identifiers, list):
        for identifier_value in identifiers:
            identifier = _dict(identifier_value)
            identifier_type = _string(identifier.get("type"))
            number = _string(identifier.get("identifier"))
            if identifier_type == "ISBN_10":
                isbn_10 = number
            elif identifier_type == "ISBN_13":
                isbn_13 = number

    image_links = _dict(info.get("imageLinks"))
    cover_url = _first_string(
        image_links.get("thumbnail"), image_links.get("smallThumbnail")
    )
    if cover_url and cover_url.startswith("http://"):
        cover_url = f"https://{cover_url.removeprefix('http://')}"

    page_count = info.get("pageCount")
    if not isinstance(page_count, int) or page_count <= 0:
        page_count = None

    return BookSearchResult(
        source=MetadataSource.GOOGLE_BOOKS,
        external_source_id=volume_id,
        title=title,
        subtitle=_string(info.get("subtitle")),
        authors=_string_list(info.get("authors")),
        isbn_10=isbn_10,
        isbn_13=isbn_13,
        cover_url=cover_url,
        publisher=_string(info.get("publisher")),
        published_date=_string(info.get("publishedDate")),
        page_count=page_count,
        description=_string(info.get("description")),
        language=_string(info.get("language")),
    )


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _string(value: Any) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def _first_string(*values: Any) -> str | None:
    for value in values:
        result = _string(value)
        if result:
            return result
    return None


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]
