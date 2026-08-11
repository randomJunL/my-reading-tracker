from collections.abc import AsyncGenerator
from functools import lru_cache
from typing import Annotated

import httpx
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.integrations.books import (
    BookProvider,
    GoogleBooksProvider,
    OpenLibraryProvider,
)
from app.services.book_search import BookSearchCache, BookSearchService


@lru_cache
def get_book_search_cache(ttl_seconds: int) -> BookSearchCache:
    return BookSearchCache(ttl_seconds)


async def get_book_search_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncGenerator[BookSearchService, None]:
    timeout = httpx.Timeout(settings.book_provider_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        providers: list[BookProvider] = [
            GoogleBooksProvider(
                client,
                api_key=settings.google_books_api_key,
                max_retries=settings.book_provider_max_retries,
            ),
            OpenLibraryProvider(
                client,
                contact_email=settings.open_library_contact_email,
                max_retries=settings.book_provider_max_retries,
            ),
        ]
        yield BookSearchService(
            providers,
            get_book_search_cache(settings.book_search_cache_ttl_seconds),
        )
