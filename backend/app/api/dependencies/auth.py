from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.security import (
    AuthenticatedUser,
    AuthenticationError,
    SupabaseTokenVerifier,
    get_token_verifier,
)

bearer_scheme = HTTPBearer(auto_error=False)


def get_optional_bearer_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> str | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    return credentials.credentials


def get_request_token_verifier(
    token: Annotated[str | None, Depends(get_optional_bearer_token)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SupabaseTokenVerifier | None:
    if settings.dev_auth_bypass or token is None:
        return None
    return get_token_verifier()


def get_current_user(
    token: Annotated[str | None, Depends(get_optional_bearer_token)],
    verifier: Annotated[
        SupabaseTokenVerifier | None, Depends(get_request_token_verifier)
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedUser:
    if settings.dev_auth_bypass:
        return AuthenticatedUser(
            id=settings.dev_auth_user_id,
            email=settings.dev_auth_email,
            session_id=settings.dev_auth_user_id,
        )
    if token is None or verifier is None:
        raise _credentials_exception()

    try:
        return verifier.verify(token)
    except AuthenticationError as error:
        raise _credentials_exception() from error


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
