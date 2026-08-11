import time
from collections.abc import Callable, Sequence

from app.integrations.books import (
    BookProvider,
    BookProviderUnavailableError,
    BookSearchQuery,
)
from app.schemas.book_search import BookSearchResult


class BookSearchUnavailableError(Exception):
    pass


class BookSearchCache:
    def __init__(
        self,
        ttl_seconds: int,
        *,
        clock: Callable[[], float] = time.monotonic,
        max_entries: int = 256,
    ) -> None:
        self.ttl_seconds = ttl_seconds
        self.clock = clock
        self.max_entries = max_entries
        self._entries: dict[str, tuple[float, tuple[BookSearchResult, ...]]] = {}

    def get(self, key: str) -> list[BookSearchResult] | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        expires_at, results = entry
        if expires_at <= self.clock():
            self._entries.pop(key, None)
            return None
        return list(results)

    def set(self, key: str, results: list[BookSearchResult]) -> None:
        if self.ttl_seconds == 0:
            return
        if len(self._entries) >= self.max_entries:
            oldest_key = min(self._entries, key=lambda item: self._entries[item][0])
            self._entries.pop(oldest_key, None)
        self._entries[key] = (
            self.clock() + self.ttl_seconds,
            tuple(results),
        )


class BookSearchService:
    def __init__(
        self,
        providers: Sequence[BookProvider],
        cache: BookSearchCache,
    ) -> None:
        self.providers = providers
        self.cache = cache

    async def search(
        self, query: BookSearchQuery, *, limit: int
    ) -> list[BookSearchResult]:
        cache_key = f"{query.cache_key}|{limit}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        provider_responded = False
        for provider in self.providers:
            try:
                results = await provider.search(query, limit=limit)
            except BookProviderUnavailableError:
                continue
            provider_responded = True
            if results:
                self.cache.set(cache_key, results)
                return results

        if provider_responded:
            self.cache.set(cache_key, [])
            return []
        raise BookSearchUnavailableError
