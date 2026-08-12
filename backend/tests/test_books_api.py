import uuid
from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.main import app
from app.models import (
    ActivityType,
    Book,
    Household,
    MetadataSource,
    ReadingSession,
)


@pytest.fixture
def library_client(db_session: Session) -> Generator[TestClient, None, None]:
    user = AuthenticatedUser(
        id=uuid.uuid4(), email="library@example.com", session_id=uuid.uuid4()
    )

    def override_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


def test_book_crud_and_multiple_reader_assignments(library_client: TestClient) -> None:
    maya = library_client.post("/api/v1/readers", json={"name": "Maya"}).json()
    leo = library_client.post("/api/v1/readers", json={"name": "Leo"}).json()
    created = library_client.post(
        "/api/v1/books",
        json={
            "title": "  The Wild Robot  ",
            "authors": [" Peter Brown "],
            "page_count": 288,
            "metadata_source": "google_books",
            "external_source_id": "volume-1",
        },
    )
    assert created.status_code == 201
    book = created.json()
    assert book["title"] == "The Wild Robot"
    assert book["authors"] == ["Peter Brown"]

    first = library_client.post(
        f"/api/v1/readers/{maya['id']}/books",
        json={"book_id": book["id"], "status": "reading"},
    )
    second = library_client.post(
        f"/api/v1/readers/{leo['id']}/books",
        json={"book_id": book["id"], "status": "planned"},
    )
    assert first.status_code == second.status_code == 201

    maya_library = library_client.get(
        "/api/v1/books", params={"reader_id": maya["id"], "status": "reading"}
    ).json()
    assert [item["id"] for item in maya_library] == [book["id"]]
    assert (
        len(library_client.get(f"/api/v1/books/{book['id']}").json()["reader_books"])
        == 2
    )

    update = library_client.patch(
        f"/api/v1/readers/{maya['id']}/books/{book['id']}",
        json={"status": "finished", "finished_at": "2026-08-12"},
    )
    assert update.status_code == 200
    assert update.json()["status"] == "finished"

    metadata = library_client.patch(
        f"/api/v1/books/{book['id']}", json={"title": "The Wild Robot (Updated)"}
    )
    assert metadata.status_code == 200
    assert metadata.json()["title"] == "The Wild Robot (Updated)"

    assert (
        library_client.delete(
            f"/api/v1/readers/{leo['id']}/books/{book['id']}"
        ).status_code
        == 204
    )


def test_duplicate_reader_book_returns_conflict(library_client: TestClient) -> None:
    reader = library_client.post("/api/v1/readers", json={"name": "Maya"}).json()
    book = library_client.post(
        "/api/v1/books", json={"title": "Book", "metadata_source": "manual"}
    ).json()
    url = f"/api/v1/readers/{reader['id']}/books"
    payload = {"book_id": book["id"], "status": "planned"}
    assert library_client.post(url, json=payload).status_code == 201
    assert library_client.post(url, json=payload).status_code == 409


def test_cross_household_book_is_hidden(
    library_client: TestClient, db_session: Session
) -> None:
    household = Household(name="Other")
    book = Book(
        household=household,
        title="Hidden",
        authors=[],
        metadata_source=MetadataSource.MANUAL,
    )
    db_session.add(book)
    db_session.commit()

    assert library_client.get(f"/api/v1/books/{book.id}").status_code == 404
    assert (
        library_client.patch(
            f"/api/v1/books/{book.id}", json={"title": "No"}
        ).status_code
        == 404
    )
    assert library_client.delete(f"/api/v1/books/{book.id}").status_code == 404


def test_book_with_reading_history_requires_confirmation(
    library_client: TestClient, db_session: Session
) -> None:
    reader_data = library_client.post("/api/v1/readers", json={"name": "Maya"}).json()
    book_data = library_client.post(
        "/api/v1/books", json={"title": "Book", "metadata_source": "manual"}
    ).json()
    library_client.post(
        f"/api/v1/readers/{reader_data['id']}/books",
        json={"book_id": book_data["id"], "status": "reading"},
    )
    db_session.add(
        ReadingSession(
            reader_id=uuid.UUID(reader_data["id"]),
            book_id=uuid.UUID(book_data["id"]),
            session_date=date(2026, 8, 12),
            minutes=20,
            activity_type=ActivityType.INDEPENDENT,
        )
    )
    db_session.commit()

    url = f"/api/v1/books/{book_data['id']}"
    assert library_client.delete(url).status_code == 409
    assert (
        library_client.delete(url, params={"confirm_history": "true"}).status_code
        == 204
    )
