import asyncio
from dataclasses import dataclass, field

from app.integrations.books import BookProviderUnavailableError, BookSearchQuery
from app.models import MetadataSource
from app.schemas.book_search import BookSearchResult
from app.services.book_search import (
    BookSearchCache,
    BookSearchService,
    BookSearchUnavailableError,
)


def test_search_falls_back_and_caches_the_result() -> None:
    google = FakeProvider(name="google_books", unavailable=True)
    open_library = FakeProvider(name="open_library", results=[_result()])
    service = BookSearchService([google, open_library], BookSearchCache(ttl_seconds=60))
    query = BookSearchQuery(text="The Wild Robot")

    first = asyncio.run(service.search(query, limit=10))
    second = asyncio.run(service.search(query, limit=10))

    assert first == second == [_result()]
    assert google.calls == 1
    assert open_library.calls == 1


def test_empty_primary_result_uses_fallback() -> None:
    google = FakeProvider(name="google_books")
    open_library = FakeProvider(name="open_library", results=[_result()])
    service = BookSearchService([google, open_library], BookSearchCache(60))

    results = asyncio.run(
        service.search(BookSearchQuery(author="Peter Brown"), limit=5)
    )

    assert results == [_result()]
    assert google.calls == open_library.calls == 1


def test_total_provider_outage_is_recoverable() -> None:
    service = BookSearchService(
        [
            FakeProvider(name="google_books", unavailable=True),
            FakeProvider(name="open_library", unavailable=True),
        ],
        BookSearchCache(60),
    )

    try:
        asyncio.run(service.search(BookSearchQuery(text="book"), limit=10))
    except BookSearchUnavailableError:
        pass
    else:
        raise AssertionError("Expected search outage")


def test_cache_expires() -> None:
    now = 100.0
    cache = BookSearchCache(10, clock=lambda: now)
    cache.set("query", [_result()])
    assert cache.get("query") == [_result()]

    now = 111.0
    assert cache.get("query") is None


@dataclass
class FakeProvider:
    name: str
    results: list[BookSearchResult] = field(default_factory=list)
    unavailable: bool = False
    calls: int = 0

    async def search(
        self, query: BookSearchQuery, *, limit: int
    ) -> list[BookSearchResult]:
        self.calls += 1
        if self.unavailable:
            raise BookProviderUnavailableError(self.name)
        return self.results[:limit]


def _result() -> BookSearchResult:
    return BookSearchResult(
        source=MetadataSource.OPEN_LIBRARY,
        external_source_id="OL123W",
        title="The Wild Robot",
        authors=["Peter Brown"],
        cover_url="https://covers.openlibrary.org/b/id/123-M.jpg",
    )
