import asyncio
from collections.abc import Callable

import httpx

from app.integrations.books import (
    BookProviderUnavailableError,
    BookSearchQuery,
    GoogleBooksProvider,
    OpenLibraryProvider,
)
from app.models import MetadataSource


def test_google_books_builds_fielded_query_and_normalizes_volume() -> None:
    captured_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(
            200,
            json={
                "items": [
                    {
                        "id": "google-volume-1",
                        "volumeInfo": {
                            "title": "The Wild Robot",
                            "subtitle": "A Novel",
                            "authors": ["Peter Brown"],
                            "industryIdentifiers": [
                                {"type": "ISBN_10", "identifier": "0316381993"},
                                {
                                    "type": "ISBN_13",
                                    "identifier": "9780316381994",
                                },
                            ],
                            "imageLinks": {
                                "thumbnail": "http://books.google.com/cover.jpg"
                            },
                            "publisher": "Little, Brown",
                            "publishedDate": "2016-04-05",
                            "pageCount": 288,
                            "description": "A robot learns to live in the wild.",
                            "language": "en",
                        },
                    }
                ]
            },
        )

    results = asyncio.run(
        _google_provider(handler).search(
            BookSearchQuery(title="Wild Robot", author="Peter Brown"), limit=5
        )
    )

    assert captured_request is not None
    assert captured_request.url.params["q"] == (
        'intitle:"Wild Robot" inauthor:"Peter Brown"'
    )
    assert captured_request.url.params["key"] == "private-test-key"
    assert len(results) == 1
    assert results[0].source is MetadataSource.GOOGLE_BOOKS
    assert results[0].external_source_id == "google-volume-1"
    assert results[0].isbn_13 == "9780316381994"
    assert results[0].cover_url == "https://books.google.com/cover.jpg"
    assert "private-test-key" not in results[0].model_dump_json()


def test_google_books_retries_one_temporary_failure() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(503, request=request)
        return httpx.Response(200, json={"items": []}, request=request)

    results = asyncio.run(
        _google_provider(handler, max_retries=1).search(
            BookSearchQuery(text="Charlotte's Web"), limit=10
        )
    )

    assert results == []
    assert calls == 2


def test_open_library_normalizes_results_and_identifies_application() -> None:
    captured_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(
            200,
            json={
                "docs": [
                    {
                        "key": "/works/OL123W",
                        "title": "The Wild Robot",
                        "author_name": ["Peter Brown"],
                        "isbn": ["0316381993", "9780316381994"],
                        "cover_i": 12345,
                        "publisher": ["Little, Brown"],
                        "first_publish_year": 2016,
                        "language": ["eng"],
                        "number_of_pages_median": 288,
                    }
                ]
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OpenLibraryProvider(
        client,
        contact_email="developer@example.com",
        max_retries=0,
    )
    results = asyncio.run(
        provider.search(BookSearchQuery(isbn="9780316381994"), limit=5)
    )
    asyncio.run(client.aclose())

    assert captured_request is not None
    assert captured_request.url.params["isbn"] == "9780316381994"
    assert captured_request.headers["User-Agent"] == (
        "MyReadingTracker/0.1 (developer@example.com)"
    )
    assert results[0].source is MetadataSource.OPEN_LIBRARY
    assert results[0].external_source_id == "OL123W"
    assert results[0].cover_url == ("https://covers.openlibrary.org/b/id/12345-M.jpg")
    assert results[0].page_count == 288


def test_provider_converts_raw_http_error_to_safe_domain_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            403,
            json={"error": {"message": "private upstream details"}},
            request=request,
        )

    provider = _google_provider(handler)

    try:
        asyncio.run(provider.search(BookSearchQuery(text="book"), limit=10))
    except BookProviderUnavailableError as error:
        assert str(error) == "google_books"
        assert "private upstream details" not in str(error)
    else:
        raise AssertionError("Expected provider failure")


def _google_provider(
    handler: Callable[[httpx.Request], httpx.Response], *, max_retries: int = 0
) -> GoogleBooksProvider:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return GoogleBooksProvider(
        client,
        api_key="private-test-key",
        max_retries=max_retries,
    )
