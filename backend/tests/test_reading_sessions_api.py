import uuid
from collections.abc import Generator
from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
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
    Reader,
    ReaderBook,
    ReadingSession,
    ReadingStatus,
)


@pytest.fixture
def session_client(db_session: Session) -> Generator[TestClient, None, None]:
    user = AuthenticatedUser(
        id=uuid.uuid4(), email="sessions@example.com", session_id=uuid.uuid4()
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


@pytest.mark.parametrize(
    "activity_type",
    ["independent", "with_adult", "read_aloud", "audiobook"],
)
def test_create_supports_every_activity_and_repeated_readings(
    session_client: TestClient, activity_type: str
) -> None:
    reader, book = _create_library(session_client)
    payload = {
        "reader_id": reader["id"],
        "book_id": book["id"],
        "session_date": "2026-08-12",
        "minutes": 15,
        "start_page": 1,
        "end_page": 12,
        "activity_type": activity_type,
    }

    first = session_client.post("/api/v1/reading-sessions", json=payload)
    second = session_client.post("/api/v1/reading-sessions", json=payload)

    assert first.status_code == second.status_code == 201
    assert first.json()["id"] != second.json()["id"]
    assert first.json()["book_title"] == "The Wild Robot"
    assert first.json()["activity_type"] == activity_type

    listed = session_client.get(
        "/api/v1/reading-sessions", params={"reader_id": reader["id"]}
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 2


def test_finishing_session_updates_reader_book_consistently(
    session_client: TestClient, db_session: Session
) -> None:
    reader, book = _create_library(session_client)
    response = session_client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": book["id"],
            "session_date": "2026-08-12",
            "minutes": 25,
            "activity_type": "independent",
            "finished_book": True,
        },
    )

    assert response.status_code == 201
    assignment = db_session.scalar(
        select(ReaderBook).where(
            ReaderBook.reader_id == uuid.UUID(reader["id"]),
            ReaderBook.book_id == uuid.UUID(book["id"]),
        )
    )
    assert assignment is not None
    db_session.refresh(assignment)
    assert assignment.status is ReadingStatus.FINISHED
    assert assignment.started_at is not None
    assert assignment.finished_at is not None
    assert assignment.started_at.isoformat() == "2026-08-12"
    assert assignment.finished_at.isoformat() == "2026-08-12"


def test_session_update_validates_effective_page_range_and_delete(
    session_client: TestClient,
) -> None:
    reader, book = _create_library(session_client)
    created = session_client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": book["id"],
            "session_date": "2026-08-12",
            "minutes": 10,
            "start_page": 10,
            "end_page": 20,
            "activity_type": "with_adult",
        },
    ).json()
    url = f"/api/v1/reading-sessions/{created['id']}"

    assert session_client.patch(url, json={"end_page": 5}).status_code == 422
    updated = session_client.patch(url, json={"minutes": 20, "notes": "Great focus"})
    assert updated.status_code == 200
    assert updated.json()["minutes"] == 20
    assert updated.json()["notes"] == "Great focus"
    assert session_client.delete(url).status_code == 204
    assert session_client.get(url).status_code == 404


@pytest.mark.parametrize(
    "overrides",
    [
        {"minutes": 0},
        {"minutes": -5},
        {"start_page": -1},
        {"start_page": 20, "end_page": 10},
        {"activity_type": "telepathy"},
    ],
)
def test_session_input_validation(
    session_client: TestClient, overrides: dict[str, object]
) -> None:
    reader, book = _create_library(session_client)
    payload: dict[str, object] = {
        "reader_id": reader["id"],
        "book_id": book["id"],
        "session_date": "2026-08-12",
        "minutes": 10,
        "activity_type": "independent",
    }
    payload.update(overrides)

    assert (
        session_client.post("/api/v1/reading-sessions", json=payload).status_code == 422
    )


def test_session_requires_book_in_readers_library(session_client: TestClient) -> None:
    reader = session_client.post("/api/v1/readers", json={"name": "Maya"}).json()
    book = session_client.post(
        "/api/v1/books", json={"title": "Unassigned", "metadata_source": "manual"}
    ).json()

    response = session_client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": book["id"],
            "session_date": "2026-08-12",
            "minutes": 10,
            "activity_type": "independent",
        },
    )

    assert response.status_code == 409


def test_reader_book_with_history_cannot_be_detached(
    session_client: TestClient,
) -> None:
    reader, book = _create_library(session_client)
    created = session_client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": book["id"],
            "session_date": "2026-08-12",
            "minutes": 10,
            "activity_type": "independent",
        },
    )
    assert created.status_code == 201

    response = session_client.delete(
        f"/api/v1/readers/{reader['id']}/books/{book['id']}"
    )

    assert response.status_code == 409
    assert "Delete those sessions" in response.json()["detail"]


def test_cross_household_session_is_hidden(
    session_client: TestClient, db_session: Session
) -> None:
    household = Household(name="Other")
    reader = Reader(household=household, name="Hidden")
    db_session.add(reader)
    db_session.flush()
    book = Book(
        household=household,
        title="Hidden book",
        authors=[],
        metadata_source=MetadataSource.MANUAL,
    )
    db_session.add(book)
    db_session.flush()
    record = ReadingSession(
        reader_id=reader.id,
        book_id=book.id,
        session_date=date(2026, 8, 12),
        minutes=10,
        activity_type=ActivityType.INDEPENDENT,
    )
    db_session.add(record)
    db_session.commit()

    url = f"/api/v1/reading-sessions/{record.id}"
    assert session_client.get(url).status_code == 404
    assert session_client.patch(url, json={"minutes": 15}).status_code == 404
    assert session_client.delete(url).status_code == 404


def _create_library(client: TestClient) -> tuple[dict[str, Any], dict[str, Any]]:
    reader = client.post("/api/v1/readers", json={"name": "Maya"}).json()
    book = client.post(
        "/api/v1/books",
        json={"title": "The Wild Robot", "metadata_source": "manual"},
    ).json()
    response = client.post(
        f"/api/v1/readers/{reader['id']}/books",
        json={"book_id": book["id"], "status": "planned"},
    )
    assert response.status_code == 201
    return reader, book
