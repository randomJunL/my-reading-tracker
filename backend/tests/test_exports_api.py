import csv
import io
import uuid
from collections.abc import Generator
from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader
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
    ReadingSession,
)


@pytest.fixture
def export_client(db_session: Session) -> Generator[TestClient, None, None]:
    user = AuthenticatedUser(
        id=uuid.uuid4(), email="exports@example.com", session_id=uuid.uuid4()
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


def test_json_export_contains_complete_household_reading_data(
    export_client: TestClient, db_session: Session
) -> None:
    reader, book, reading_session = _seed_reading(export_client)
    _seed_other_household(db_session)

    response = export_client.get("/api/v1/exports/reading-data")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert "attachment" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith('.json"')
    data = response.json()
    assert data["schema_version"] == 2
    assert data["household_name"] == "My Household"
    assert [item["id"] for item in data["readers"]] == [reader["id"]]
    assert [item["id"] for item in data["books"]] == [book["id"]]
    assert data["reader_books"][0]["status"] == "finished"
    assert [item["id"] for item in data["reading_sessions"]] == [reading_session["id"]]
    assert data["reading_sessions"][0]["notes"] == '=HYPERLINK("x"), wow'
    assert data["badge_definitions"]
    assert data["reader_badges"]
    assert data["reward_transactions"]
    assert data["reward_items"] == []
    assert data["reward_redemptions"] == []
    assert "Hidden book" not in response.text


def test_csv_export_is_human_readable_and_escapes_values(
    export_client: TestClient,
) -> None:
    _seed_reading(export_client)

    response = export_client.get(
        "/api/v1/exports/reading-data", params={"format": "csv"}
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"].endswith('.csv"')
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert rows == [
        {
            "Date": "2026-08-12",
            "Reader": "Maya",
            "Book": "A Book, With Commas",
            "Authors": "A. Writer; B. Writer",
            "Minutes": "25",
            "Start page": "10",
            "End page": "35",
            "Pages read": "25",
            "Activity": "With Adult",
            "Finished book": "Yes",
            "Notes": '\'=HYPERLINK("x"), wow',
        }
    ]


def test_finished_books_export_aggregates_each_readers_book(
    export_client: TestClient,
) -> None:
    reader, book, _ = _seed_reading(export_client)
    earlier = export_client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": book["id"],
            "session_date": "2026-08-10",
            "minutes": 10,
            "start_page": 0,
            "end_page": 10,
            "activity_type": "independent",
        },
    )
    assert earlier.status_code == 201

    response = export_client.get(
        "/api/v1/exports/reading-data",
        params={"format": "finished-books-csv"},
    )

    assert response.status_code == 200
    assert response.headers["content-disposition"].startswith(
        'attachment; filename="finished-books-'
    )
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert rows == [
        {
            "Reader": "Maya",
            "Book": "A Book, With Commas",
            "Authors": "A. Writer; B. Writer",
            "Finished date": "2026-08-12",
            "Started date": "2026-08-12",
            "First reading date": "2026-08-10",
            "Last reading date": "2026-08-12",
            "Total reading minutes": "35",
            "Total pages read": "35",
            "Reading sessions": "2",
            "Book page count": "100",
            "ISBN-13": "",
        }
    ]


def test_school_report_pdf_is_printable_and_reader_scoped(
    export_client: TestClient, db_session: Session
) -> None:
    reader, book, _ = _seed_reading(export_client)
    _seed_other_household(db_session)
    missing_finished_date = export_client.patch(
        f"/api/v1/readers/{reader['id']}/books/{book['id']}",
        json={"finished_at": None},
    )
    assert missing_finished_date.status_code == 200
    later_session = export_client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": book["id"],
            "session_date": "2026-08-13",
            "minutes": 5,
            "start_page": 35,
            "end_page": 40,
            "activity_type": "independent",
        },
    )
    assert later_session.status_code == 201
    status_only_book = export_client.post(
        "/api/v1/books",
        json={
            "title": "Finished From Library Status",
            "authors": ["A. Teacher"],
            "metadata_source": "manual",
        },
    ).json()
    status_only_assignment = export_client.post(
        f"/api/v1/readers/{reader['id']}/books",
        json={"book_id": status_only_book["id"], "status": "finished"},
    )
    assert status_only_assignment.status_code == 201
    status_only_session = export_client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": status_only_book["id"],
            "session_date": "2026-08-11",
            "minutes": 10,
            "activity_type": "independent",
        },
    )
    assert status_only_session.status_code == 201

    response = export_client.get(
        "/api/v1/exports/school-reading-report",
        params={
            "reader_id": reader["id"],
            "date_from": "2026-08-01",
            "date_to": "2026-08-31",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith(
        'attachment; filename="reading-achievement-maya-'
    )
    assert response.content.startswith(b"%PDF")
    pdf = PdfReader(io.BytesIO(response.content))
    assert len(pdf.pages) == 1
    text = "\n".join(page.extract_text() for page in pdf.pages)
    assert "READING ACHIEVEMENT REPORT" in text
    assert "Maya" in text
    assert "Aug 01, 2026 - Aug 31, 2026" in text
    assert "A Book, With Commas" in text
    assert "Finished From Library Status" in text
    assert " 2\nBOOKS FINISHED" in text
    assert "Aug 12, 2026" in text
    assert "25" in text
    assert "ACHIEVEMENTS EARNED" not in text
    assert "TEACHER NOTES" not in text
    assert "Hidden reader" not in text


def test_empty_export_and_invalid_format(export_client: TestClient) -> None:
    response = export_client.get("/api/v1/exports/reading-data")
    assert response.status_code == 200
    assert response.json()["readers"] == []
    assert response.json()["reading_sessions"] == []
    assert (
        export_client.get(
            "/api/v1/exports/reading-data", params={"format": "xml"}
        ).status_code
        == 422
    )


def _seed_reading(
    client: TestClient,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    reader = client.post("/api/v1/readers", json={"name": "Maya"}).json()
    book = client.post(
        "/api/v1/books",
        json={
            "title": "A Book, With Commas",
            "authors": ["A. Writer", "B. Writer"],
            "page_count": 100,
            "metadata_source": "manual",
        },
    ).json()
    assigned = client.post(
        f"/api/v1/readers/{reader['id']}/books",
        json={"book_id": book["id"], "status": "planned"},
    )
    assert assigned.status_code == 201
    reading_session = client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": book["id"],
            "session_date": "2026-08-12",
            "minutes": 25,
            "start_page": 10,
            "end_page": 35,
            "activity_type": "with_adult",
            "notes": '=HYPERLINK("x"), wow',
            "finished_book": True,
        },
    ).json()
    return reader, book, reading_session


def _seed_other_household(session: Session) -> None:
    household = Household(name="Hidden household")
    reader = Reader(household=household, name="Hidden reader")
    book = Book(
        household=household,
        title="Hidden book",
        authors=[],
        metadata_source=MetadataSource.MANUAL,
    )
    session.add_all([reader, book])
    session.flush()
    session.add(
        ReadingSession(
            reader=reader,
            book=book,
            session_date=date(2026, 8, 12),
            minutes=10,
            activity_type=ActivityType.INDEPENDENT,
        )
    )
    session.commit()
