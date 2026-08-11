import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError

from app.core.config import get_settings

ALLOWED_JWT_ALGORITHMS = ["ES256", "RS256"]
REQUIRED_JWT_CLAIMS = [
    "aud",
    "email",
    "exp",
    "iat",
    "iss",
    "role",
    "session_id",
    "sub",
]


class AuthenticationError(Exception):
    """Raised when a bearer token cannot authenticate a parent."""


@dataclass(frozen=True)
class AuthenticatedUser:
    id: uuid.UUID
    email: str
    session_id: uuid.UUID


class SupabaseTokenVerifier:
    def __init__(self, *, issuer: str, audience: str, jwks_url: str) -> None:
        self.issuer = issuer
        self.audience = audience
        self.jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=600)

    def verify(self, token: str) -> AuthenticatedUser:
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            claims: dict[str, Any] = jwt.decode(
                token,
                signing_key.key,
                algorithms=ALLOWED_JWT_ALGORITHMS,
                audience=self.audience,
                issuer=self.issuer,
                options={"require": REQUIRED_JWT_CLAIMS},
            )
            if claims["role"] != "authenticated" or claims.get("is_anonymous", False):
                raise AuthenticationError

            email = claims["email"]
            if not isinstance(email, str) or not email:
                raise AuthenticationError

            return AuthenticatedUser(
                id=uuid.UUID(claims["sub"]),
                email=email,
                session_id=uuid.UUID(claims["session_id"]),
            )
        except AuthenticationError:
            raise
        except (InvalidTokenError, PyJWKClientError, TypeError, ValueError) as error:
            raise AuthenticationError from error


@lru_cache
def get_token_verifier() -> SupabaseTokenVerifier:
    settings = get_settings()
    return SupabaseTokenVerifier(
        issuer=settings.auth_issuer,
        audience=settings.supabase_jwt_audience,
        jwks_url=settings.auth_jwks_url,
    )
