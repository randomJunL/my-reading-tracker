import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.auth_admin import get_supabase_auth_admin
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.integrations.auth.supabase_admin import InvitationEmailError
from app.main import app


class InvitationSenderStub:
    def __init__(self) -> None:
        self.sent_to: list[str] = []

    def invite_reader(self, email: str) -> None:
        self.sent_to.append(email)


class FailingInvitationSenderStub:
    def invite_reader(self, email: str) -> None:
        raise InvitationEmailError


@pytest.fixture
def role_client(
    db_session: Session,
) -> Generator[tuple[TestClient, dict[str, AuthenticatedUser]], None, None]:
    current = {
        "user": AuthenticatedUser(
            id=uuid.uuid4(), email="admin@example.com", session_id=uuid.uuid4()
        )
    }
    invitation_sender = InvitationSenderStub()

    def override_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_current_user] = lambda: current["user"]
    app.dependency_overrides[get_supabase_auth_admin] = lambda: invitation_sender
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
    leo = client.post("/api/v1/readers", json={"name": "Leo"}).json()
    invitation = client.post(
        "/api/v1/reader-login-invitations",
        json={"email": "maya@example.com"},
    )
    assert invitation.status_code == 201
    assert invitation.json()["reader_id"] is None

    current["user"] = AuthenticatedUser(
        id=uuid.uuid4(),
        email="MAYA@example.com",
        session_id=uuid.uuid4(),
        full_name="Maya Reader",
        account_type="reader",
    )
    me = client.get("/api/v1/me")
    assert me.status_code == 200
    assert me.json()["role"] == "reader"
    reader_id = me.json()["reader_id"]
    assert reader_id is not None
    assert me.json()["is_admin"] is False

    readers = client.get("/api/v1/readers").json()
    assert len(readers) == 1
    assert readers[0]["id"] == reader_id
    assert readers[0]["name"] == "Maya Reader"
    assert readers[0]["avatar_key"] is None
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


def test_reader_activation_requires_a_name_for_automatic_profile(
    role_client: tuple[TestClient, dict[str, AuthenticatedUser]],
) -> None:
    client, current = role_client
    invitation = client.post(
        "/api/v1/reader-login-invitations",
        json={"email": "nameless@example.com"},
    )
    assert invitation.status_code == 201

    current["user"] = AuthenticatedUser(
        id=uuid.uuid4(),
        email="nameless@example.com",
        session_id=uuid.uuid4(),
        account_type="reader",
    )

    response = client.get("/api/v1/me")

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "A reader name is required to activate this invitation"
    )


def test_invited_reader_cannot_create_an_owner_household(
    role_client: tuple[TestClient, dict[str, AuthenticatedUser]],
) -> None:
    client, current = role_client
    current["user"] = AuthenticatedUser(
        id=uuid.uuid4(),
        email="uninvited-reader@example.com",
        session_id=uuid.uuid4(),
        account_type="reader",
    )

    response = client.get("/api/v1/me")

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "A valid invitation is required for this account type"
    )


def test_failed_invitation_email_does_not_leave_pending_access(
    role_client: tuple[TestClient, dict[str, AuthenticatedUser]],
) -> None:
    client, _ = role_client
    app.dependency_overrides[get_supabase_auth_admin] = lambda: (
        FailingInvitationSenderStub()
    )

    response = client.post(
        "/api/v1/reader-login-invitations",
        json={"email": "failed@example.com"},
    )

    assert response.status_code == 502
    assert client.get("/api/v1/reader-login-invitations").json() == []
