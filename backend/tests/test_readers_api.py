import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.main import app
from app.models import (
    Book,
    Household,
    MetadataSource,
    Reader,
    ReaderBook,
    ReadingStatus,
)


@pytest.fixture
def authenticated_client(db_session: Session) -> Generator[TestClient, None, None]:
    user = AuthenticatedUser(
        id=uuid.uuid4(),
        email="reader-parent@example.com",
        session_id=uuid.uuid4(),
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


def test_reader_crud_trims_names_and_lists_household_readers(
    authenticated_client: TestClient,
) -> None:
    first = authenticated_client.post(
        "/api/v1/readers", json={"name": "  Maya  ", "avatar_key": "coral"}
    )
    second = authenticated_client.post(
        "/api/v1/readers", json={"name": "Leo", "avatar_key": None}
    )

    assert first.status_code == 201
    assert first.json()["name"] == "Maya"
    assert second.status_code == 201

    response = authenticated_client.get("/api/v1/readers")
    assert response.status_code == 200
    assert [reader["name"] for reader in response.json()] == ["Maya", "Leo"]

    reader_id = first.json()["id"]
    update = authenticated_client.patch(
        f"/api/v1/readers/{reader_id}",
        json={"name": "  Maya Rose ", "avatar_key": "teal"},
    )
    assert update.status_code == 200
    assert update.json()["name"] == "Maya Rose"
    assert update.json()["avatar_key"] == "teal"

    assert authenticated_client.get(f"/api/v1/readers/{reader_id}").status_code == 200
    assert (
        authenticated_client.delete(f"/api/v1/readers/{reader_id}").status_code == 204
    )
    assert authenticated_client.get(f"/api/v1/readers/{reader_id}").status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 81},
        {"name": "Maya", "avatar_key": "Not Allowed"},
    ],
)
def test_create_reader_validates_input(
    authenticated_client: TestClient, payload: dict[str, str]
) -> None:
    response = authenticated_client.post("/api/v1/readers", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize("payload", [{}, {"name": None}])
def test_update_reader_requires_a_valid_change(
    authenticated_client: TestClient, payload: dict[str, str | None]
) -> None:
    created = authenticated_client.post("/api/v1/readers", json={"name": "Maya"})

    response = authenticated_client.patch(
        f"/api/v1/readers/{created.json()['id']}", json=payload
    )

    assert response.status_code == 422


def test_reader_endpoints_hide_other_households(
    authenticated_client: TestClient, db_session: Session
) -> None:
    other_household = Household(name="Other household")
    other_reader = Reader(household=other_household, name="Hidden child")
    db_session.add(other_reader)
    db_session.commit()

    reader_url = f"/api/v1/readers/{other_reader.id}"
    assert authenticated_client.get(reader_url).status_code == 404
    assert (
        authenticated_client.patch(reader_url, json={"name": "Changed"}).status_code
        == 404
    )
    assert authenticated_client.delete(reader_url).status_code == 404

    assert (
        db_session.scalar(select(Reader).where(Reader.id == other_reader.id))
        is not None
    )


def test_deleting_reader_with_history_requires_explicit_confirmation(
    authenticated_client: TestClient, db_session: Session
) -> None:
    created = authenticated_client.post("/api/v1/readers", json={"name": "Maya"})
    reader_id = uuid.UUID(created.json()["id"])
    reader = db_session.get(Reader, reader_id)
    assert reader is not None
    book = Book(
        household_id=reader.household_id,
        title="The Wild Robot",
        authors=["Peter Brown"],
        metadata_source=MetadataSource.MANUAL,
    )
    db_session.add(book)
    db_session.flush()
    db_session.add(
        ReaderBook(
            reader_id=reader.id,
            book_id=book.id,
            status=ReadingStatus.READING,
        )
    )
    db_session.commit()

    conflict = authenticated_client.delete(f"/api/v1/readers/{reader_id}")
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "reader_has_history"
    assert db_session.get(Reader, reader_id) is not None

    confirmed = authenticated_client.delete(
        f"/api/v1/readers/{reader_id}", params={"confirm_history": "true"}
    )
    assert confirmed.status_code == 204
    db_session.expire_all()
    assert db_session.get(Reader, reader_id) is None
