import time
import uuid
from collections.abc import Generator
from dataclasses import dataclass
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_request_token_verifier
from app.api.dependencies.household import require_household_access
from app.core.config import Settings, get_settings
from app.core.security import (
    AuthenticatedUser,
    AuthenticationError,
    SupabaseTokenVerifier,
)
from app.database.session import get_db
from app.main import app
from app.models import Household, HouseholdMember, HouseholdRole
from app.services.households import HouseholdContext

ISSUER = "https://project.supabase.co/auth/v1"
AUDIENCE = "authenticated"


class StaticSigningKeyClient:
    def __init__(self, key: Any) -> None:
        self.key = key

    def get_signing_key_from_jwt(self, _: str) -> "StaticSigningKeyClient":
        return self


class StaticVerifier:
    def __init__(self, user: AuthenticatedUser | None) -> None:
        self.user = user

    def verify(self, _: str) -> AuthenticatedUser:
        if self.user is None:
            raise AuthenticationError
        return self.user


@pytest.fixture
def signing_keys() -> tuple[Any, Any]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def test_token_verifier_accepts_valid_supabase_access_token(
    signing_keys: tuple[Any, Any],
) -> None:
    private_key, public_key = signing_keys
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()
    verifier = _verifier(public_key)

    user = verifier.verify(_token(private_key, user_id=user_id, session_id=session_id))

    assert user == AuthenticatedUser(
        id=user_id,
        email="parent@example.com",
        session_id=session_id,
    )


@pytest.mark.parametrize(
    "claim_overrides",
    [
        {"exp": int(time.time()) - 1},
        {"aud": "anon"},
        {"iss": "https://attacker.example/auth/v1"},
        {"role": "service_role"},
        {"is_anonymous": True},
    ],
)
def test_token_verifier_rejects_untrusted_tokens(
    signing_keys: tuple[Any, Any], claim_overrides: dict[str, Any]
) -> None:
    private_key, public_key = signing_keys

    with pytest.raises(AuthenticationError):
        _verifier(public_key).verify(_token(private_key, **claim_overrides))


def test_me_requires_bearer_token() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_rejects_invalid_bearer_token() -> None:
    app.dependency_overrides[get_request_token_verifier] = lambda: StaticVerifier(None)
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/me", headers={"Authorization": "Bearer invalid"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401


def test_me_provisions_one_owner_household(
    db_session: Session,
) -> None:
    user = AuthenticatedUser(
        id=uuid.uuid4(), email="parent@example.com", session_id=uuid.uuid4()
    )

    def override_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_request_token_verifier] = lambda: StaticVerifier(user)
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            first_response = client.get(
                "/api/v1/me", headers={"Authorization": "Bearer valid"}
            )
            second_response = client.get(
                "/api/v1/me", headers={"Authorization": "Bearer valid"}
            )
    finally:
        app.dependency_overrides.clear()

    assert first_response.status_code == 200
    assert first_response.json() == second_response.json()
    assert first_response.json()["email"] == "parent@example.com"
    assert first_response.json()["role"] == "owner"
    membership = db_session.scalar(
        select(HouseholdMember).where(HouseholdMember.user_id == user.id)
    )
    assert membership is not None
    assert membership.role == HouseholdRole.OWNER
    assert str(membership.household_id) == first_response.json()["household_id"]


def test_development_bypass_provisions_household_without_token(
    db_session: Session,
) -> None:
    user_id = uuid.uuid4()
    settings = Settings(
        _env_file=None,
        app_env="development",
        dev_auth_bypass=True,
        dev_auth_user_id=user_id,
        dev_auth_email="local@example.test",
    )

    def override_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["user_id"] == str(user_id)
    assert response.json()["email"] == "local@example.test"
    membership = db_session.scalar(
        select(HouseholdMember).where(HouseholdMember.user_id == user_id)
    )
    assert membership is not None
    assert membership.role is HouseholdRole.OWNER


def test_cross_household_record_access_is_hidden() -> None:
    household = Household(id=uuid.uuid4(), name="First")
    membership = HouseholdMember(
        household=household, user_id=uuid.uuid4(), role=HouseholdRole.OWNER
    )
    context = HouseholdContext(household=household, membership=membership)
    other_record = HouseholdOwnedRecord(household_id=uuid.uuid4())

    with pytest.raises(HTTPException) as error:
        require_household_access(other_record, context)

    assert error.value.status_code == 404


@dataclass
class HouseholdOwnedRecord:
    household_id: uuid.UUID


def _verifier(public_key: Any) -> SupabaseTokenVerifier:
    verifier = SupabaseTokenVerifier(
        issuer=ISSUER,
        audience=AUDIENCE,
        jwks_url="https://unused.example/jwks.json",
    )
    verifier.jwks_client = StaticSigningKeyClient(public_key)  # type: ignore[assignment]
    return verifier


def _token(
    private_key: Any,
    *,
    user_id: uuid.UUID | None = None,
    session_id: uuid.UUID | None = None,
    **overrides: Any,
) -> str:
    now = int(time.time())
    claims: dict[str, Any] = {
        "aud": AUDIENCE,
        "email": "parent@example.com",
        "exp": now + 3600,
        "iat": now,
        "iss": ISSUER,
        "role": "authenticated",
        "session_id": str(session_id or uuid.uuid4()),
        "sub": str(user_id or uuid.uuid4()),
        "is_anonymous": False,
    }
    claims.update(overrides)
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": "test"})
