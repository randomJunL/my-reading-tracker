import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.main import app


@pytest.fixture
def role_client(
    db_session: Session,
) -> Generator[tuple[TestClient, dict[str, AuthenticatedUser]], None, None]:
    current = {
        "user": AuthenticatedUser(
            id=uuid.uuid4(), email="admin@example.com", session_id=uuid.uuid4()
        )
    }

    def override_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_current_user] = lambda: current["user"]
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            yield client, current
    finally:
        app.dependency_overrides.clear()


def test_reader_login_is_linked_and_restricted(
    role_client: tuple[TestClient, dict[str, AuthenticatedUser]],
) -> None:
    client, current = role_client
    maya = client.post("/api/v1/readers", json={"name": "Maya"}).json()
    leo = client.post("/api/v1/readers", json={"name": "Leo"}).json()
    invitation = client.post(
        "/api/v1/reader-login-invitations",
        json={"reader_id": maya["id"], "email": "maya@example.com"},
    )
    assert invitation.status_code == 201

    current["user"] = AuthenticatedUser(
        id=uuid.uuid4(), email="MAYA@example.com", session_id=uuid.uuid4()
    )
    me = client.get("/api/v1/me")
    assert me.status_code == 200
    assert me.json()["role"] == "reader"
    assert me.json()["reader_id"] == maya["id"]
    assert me.json()["is_admin"] is False

    readers = client.get("/api/v1/readers").json()
    assert [reader["id"] for reader in readers] == [maya["id"]]
    assert client.get(f"/api/v1/readers/{leo['id']}").status_code == 403
    assert client.post("/api/v1/readers", json={"name": "No"}).status_code == 403
    assert (
        client.post(
            "/api/v1/reward-items", json={"name": "No", "credit_cost": 1}
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/book-recommendations",
            json={"book": {"title": "No", "metadata_source": "manual"}},
        ).status_code
        == 403
    )
    assert (
        client.get(
            "/api/v1/reports/summary",
            params={
                "reader_id": leo["id"],
                "date_from": "2026-08-01",
                "date_to": "2026-08-31",
            },
        ).status_code
        == 403
    )


def test_caregiver_invitation_assigns_admin_access(
    role_client: tuple[TestClient, dict[str, AuthenticatedUser]],
) -> None:
    client, current = role_client
    owner_me = client.get("/api/v1/me").json()
    invitation = client.post(
        "/api/v1/caregiver-login-invitations",
        json={"email": "helper@example.com"},
    )
    assert invitation.status_code == 201
    assert invitation.json()["accepted"] is False

    current["user"] = AuthenticatedUser(
        id=uuid.uuid4(),
        email="HELPER@example.com",
        session_id=uuid.uuid4(),
        account_type="caregiver",
    )
    me = client.get("/api/v1/me")

    assert me.status_code == 200
    assert me.json()["household_id"] == owner_me["household_id"]
    assert me.json()["role"] == "caregiver"
    assert me.json()["is_admin"] is True
    assert client.post("/api/v1/readers", json={"name": "Sam"}).status_code == 201


@pytest.mark.parametrize("account_type", ["reader", "caregiver"])
def test_invited_account_types_cannot_create_an_owner_household(
    role_client: tuple[TestClient, dict[str, AuthenticatedUser]],
    account_type: str,
) -> None:
    client, current = role_client
    current["user"] = AuthenticatedUser(
        id=uuid.uuid4(),
        email=f"uninvited-{account_type}@example.com",
        session_id=uuid.uuid4(),
        account_type=account_type,
    )

    response = client.get("/api/v1/me")

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "A valid invitation is required for this account type"
    )
