import uuid

from fastapi.testclient import TestClient

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.book_search import get_book_search_service
from app.api.dependencies.household import get_household_context
from app.core.security import AuthenticatedUser
from app.integrations.books import BookSearchQuery
from app.main import app
from app.models import (
    Household,
    HouseholdMember,
    HouseholdRole,
    MetadataSource,
)
from app.schemas.book_search import BookSearchResult
from app.services.book_search import BookSearchUnavailableError
from app.services.households import HouseholdContext


def test_book_search_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/book-search", params={"q": "robot"})

    assert response.status_code == 401


def test_book_search_accepts_title_and_author_and_returns_normalized_results() -> None:
    service = StubBookSearchService(results=[_result()])
    _override_dependencies(service)
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/book-search",
                params={"title": "Wild Robot", "author": "Peter Brown", "limit": 5},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()[0]["source"] == "open_library"
    assert response.json()[0]["title"] == "The Wild Robot"
    assert service.last_query == BookSearchQuery(
        title="Wild Robot", author="Peter Brown"
    )
    assert service.last_limit == 5


def test_isbn_search_normalizes_hyphens() -> None:
    service = StubBookSearchService(results=[_result()])
    _override_dependencies(service)
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/book-search/isbn/978-0-316-38199-4")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert service.last_query == BookSearchQuery(isbn="9780316381994")


def test_invalid_isbn_is_rejected_before_provider_call() -> None:
    service = StubBookSearchService(results=[])
    _override_dependencies(service)
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/book-search/isbn/not-an-isbn")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    assert service.last_query is None


def test_search_requires_at_least_one_term() -> None:
    service = StubBookSearchService(results=[])
    _override_dependencies(service)
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/book-search")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
    assert service.last_query is None


def test_provider_outage_returns_generic_recoverable_error() -> None:
    service = StubBookSearchService(unavailable=True)
    _override_dependencies(service)
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/book-search", params={"q": "private-provider-payload"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        "detail": (
            "Book search is temporarily unavailable. "
            "You can try again or add the book manually."
        )
    }
    assert "provider" not in response.text.lower()


class StubBookSearchService:
    def __init__(
        self,
        *,
        results: list[BookSearchResult] | None = None,
        unavailable: bool = False,
    ) -> None:
        self.results = results or []
        self.unavailable = unavailable
        self.last_query: BookSearchQuery | None = None
        self.last_limit: int | None = None

    async def search(
        self, query: BookSearchQuery, *, limit: int
    ) -> list[BookSearchResult]:
        self.last_query = query
        self.last_limit = limit
        if self.unavailable:
            raise BookSearchUnavailableError
        return self.results


def _override_dependencies(service: StubBookSearchService) -> None:
    user = AuthenticatedUser(
        id=uuid.uuid4(), email="parent@example.com", session_id=uuid.uuid4()
    )
    household = Household(id=uuid.uuid4(), name="Test Household")
    membership = HouseholdMember(
        household=household,
        user_id=user.id,
        role=HouseholdRole.OWNER,
    )
    context = HouseholdContext(household=household, membership=membership)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_household_context] = lambda: context
    app.dependency_overrides[get_book_search_service] = lambda: service


def _result() -> BookSearchResult:
    return BookSearchResult(
        source=MetadataSource.OPEN_LIBRARY,
        external_source_id="OL123W",
        title="The Wild Robot",
        authors=["Peter Brown"],
        cover_url="https://covers.openlibrary.org/b/id/123-M.jpg",
    )
