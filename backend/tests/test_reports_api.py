import uuid
from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.main import app
from app.models import Household, Reader


@pytest.fixture
def report_client(db_session: Session) -> Generator[TestClient, None, None]:
    user = AuthenticatedUser(
        id=uuid.uuid4(), email="reports@example.com", session_id=uuid.uuid4()
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


def test_summary_reconciles_sessions_and_current_progress(
    report_client: TestClient,
) -> None:
    reader, current_book, finished_book = _seed_reading(report_client)

    response = report_client.get(
        "/api/v1/reports/summary",
        params={
            "reader_id": reader["id"],
            "date_from": "2026-08-01",
            "date_to": "2026-08-07",
        },
    )

    assert response.status_code == 200
    report = response.json()
    assert report["total_minutes"] == 70
    assert report["pages_read"] == 60
    assert report["books_finished"] == 1
    assert report["reading_days"] == 2
    assert report["sessions_count"] == 3
    assert [item["book_id"] for item in report["current_books"]] == [current_book["id"]]
    assert report["current_books"][0]["last_page"] == 40
    assert report["current_books"][0]["progress_percent"] == 20.0
    assert report["recent_activity"][0]["book_id"] == current_book["id"]
    assert report["recent_activity"][0]["session_date"] == "2026-08-09"
    assert finished_book["id"] not in {
        item["book_id"] for item in report["current_books"]
    }


def test_calendar_groups_daily_totals_and_validates_dates(
    report_client: TestClient,
) -> None:
    reader, _, _ = _seed_reading(report_client)
    response = report_client.get(
        "/api/v1/reports/calendar",
        params={
            "reader_id": reader["id"],
            "date_from": "2026-08-01",
            "date_to": "2026-08-07",
        },
    )

    assert response.status_code == 200
    assert response.json()["days"] == [
        {
            "date": "2026-08-02",
            "minutes": 30,
            "pages_read": 30,
            "sessions_count": 2,
            "books_finished": 1,
        },
        {
            "date": "2026-08-05",
            "minutes": 40,
            "pages_read": 30,
            "sessions_count": 1,
            "books_finished": 1,
        },
    ]
    invalid = report_client.get(
        "/api/v1/reports/calendar",
        params={
            "reader_id": reader["id"],
            "date_from": "2026-08-08",
            "date_to": "2026-08-01",
        },
    )
    assert invalid.status_code == 422


def test_report_hides_reader_from_another_household(
    report_client: TestClient, db_session: Session
) -> None:
    hidden_reader = Reader(household=Household(name="Hidden"), name="Hidden reader")
    db_session.add(hidden_reader)
    db_session.commit()

    response = report_client.get(
        "/api/v1/reports/summary",
        params={
            "reader_id": str(hidden_reader.id),
            "date_from": "2026-08-01",
            "date_to": "2026-08-07",
        },
    )

    assert response.status_code == 404


def _seed_reading(
    client: TestClient,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    reader = client.post("/api/v1/readers", json={"name": "Maya"}).json()
    current_book = client.post(
        "/api/v1/books",
        json={
            "title": "Current book",
            "page_count": 200,
            "metadata_source": "manual",
        },
    ).json()
    finished_book = client.post(
        "/api/v1/books",
        json={
            "title": "Finished book",
            "page_count": 100,
            "metadata_source": "manual",
        },
    ).json()
    for book in (current_book, finished_book):
        response = client.post(
            f"/api/v1/readers/{reader['id']}/books",
            json={"book_id": book["id"], "status": "planned"},
        )
        assert response.status_code == 201

    sessions = [
        (current_book, "2026-08-02", 20, 0, 20, False),
        (finished_book, "2026-08-02", 10, 80, 90, True),
        (finished_book, "2026-08-05", 40, 70, 100, True),
        (current_book, "2026-08-09", 15, 20, 40, False),
    ]
    for book, session_date, minutes, start_page, end_page, finished in sessions:
        response = client.post(
            "/api/v1/reading-sessions",
            json={
                "reader_id": reader["id"],
                "book_id": book["id"],
                "session_date": session_date,
                "minutes": minutes,
                "start_page": start_page,
                "end_page": end_page,
                "activity_type": "independent",
                "finished_book": finished,
            },
        )
        assert response.status_code == 201
    return reader, current_book, finished_book
