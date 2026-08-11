from typing import Any

import httpx

from app.integrations.books.base import BookSearchQuery
from app.integrations.books.http import get_json
from app.models import MetadataSource
from app.schemas.book_search import BookSearchResult


class OpenLibraryProvider:
    name = "open_library"
    search_url = "https://openlibrary.org/search.json"
    fields = ",".join(
        (
            "key",
            "title",
            "subtitle",
            "author_name",
            "isbn",
            "cover_i",
            "publisher",
            "first_publish_year",
            "language",
            "number_of_pages_median",
        )
    )

    def __init__(
        self,
        client: httpx.AsyncClient,
        *,
        contact_email: str,
        max_retries: int,
    ) -> None:
        self.client = client
        self.contact_email = contact_email
        self.max_retries = max_retries

    async def search(
        self, query: BookSearchQuery, *, limit: int
    ) -> list[BookSearchResult]:
        params: dict[str, str | int] = {
            **_open_library_query(query),
            "fields": self.fields,
            "limit": limit,
        }
        payload = await get_json(
            self.client,
            self.search_url,
            params=params,
            headers={"User-Agent": self._user_agent},
            provider_name=self.name,
            max_retries=self.max_retries,
        )
        docs = payload.get("docs")
        if not isinstance(docs, list):
            return []

        results: list[BookSearchResult] = []
        for doc in docs:
            result = _normalize_work(doc)
            if result is not None:
                results.append(result)
        return results[:limit]

    @property
    def _user_agent(self) -> str:
        contact = self.contact_email or "local-development"
        return f"MyReadingTracker/0.1 ({contact})"


def _open_library_query(query: BookSearchQuery) -> dict[str, str]:
    if query.isbn:
        return {"isbn": query.isbn}
    params: dict[str, str] = {}
    if query.text:
        params["q"] = query.text
    if query.title:
        params["title"] = query.title
    if query.author:
        params["author"] = query.author
    return params


def _normalize_work(value: Any) -> BookSearchResult | None:
    doc = _dict(value)
    key = _string(doc.get("key"))
    title = _string(doc.get("title"))
    if not key or not title:
        return None

    isbns = _string_list(doc.get("isbn"))
    isbn_10 = next((isbn for isbn in isbns if len(isbn) == 10), None)
    isbn_13 = next((isbn for isbn in isbns if len(isbn) == 13), None)
    cover_id = doc.get("cover_i")
    cover_url = (
        f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
        if isinstance(cover_id, int) and cover_id > 0
        else None
    )
    year = doc.get("first_publish_year")
    page_count = doc.get("number_of_pages_median")

    return BookSearchResult(
        source=MetadataSource.OPEN_LIBRARY,
        external_source_id=key.removeprefix("/works/"),
        title=title,
        subtitle=_string(doc.get("subtitle")),
        authors=_string_list(doc.get("author_name")),
        isbn_10=isbn_10,
        isbn_13=isbn_13,
        cover_url=cover_url,
        publisher=_first_from_list(doc.get("publisher")),
        published_date=str(year) if isinstance(year, int) else None,
        page_count=(
            page_count if isinstance(page_count, int) and page_count > 0 else None
        ),
        language=_first_from_list(doc.get("language")),
    )


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _string(value: Any) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _first_from_list(value: Any) -> str | None:
    items = _string_list(value)
    return items[0] if items else None
