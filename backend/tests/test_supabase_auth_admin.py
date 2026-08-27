import httpx
import pytest

from app.integrations.auth.supabase_admin import (
    InvitationEmailError,
    SupabaseAuthAdmin,
)


def test_invite_reader_sends_supabase_admin_request() -> None:
    captured_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(200, json={"id": "user-id"})

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        admin = SupabaseAuthAdmin(
            client=client,
            frontend_url="https://reading.example.com/",
            secret_key="sb_secret_server-secret",
            supabase_url="https://project.supabase.co/",
        )
        admin.invite_reader("reader@example.com")

    assert captured_request is not None
    assert str(captured_request.url) == (
        "https://project.supabase.co/auth/v1/invite?"
        "redirect_to=https%3A%2F%2Freading.example.com%2Faccept-invite"
    )
    assert captured_request.headers["apikey"] == "sb_secret_server-secret"
    assert "authorization" not in captured_request.headers
    assert captured_request.read() == (
        b'{"email":"reader@example.com","data":{"account_type":"reader"}}'
    )


def test_invite_reader_reports_provider_failure() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"message": "SMTP failed"}, request=request)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        admin = SupabaseAuthAdmin(
            client=client,
            frontend_url="https://reading.example.com",
            secret_key="server-secret",
            supabase_url="https://project.supabase.co",
        )
        with pytest.raises(InvitationEmailError):
            admin.invite_reader("reader@example.com")


def test_legacy_service_role_key_is_sent_as_bearer_token() -> None:
    captured_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(200, json={"id": "user-id"})

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        admin = SupabaseAuthAdmin(
            client=client,
            frontend_url="https://reading.example.com",
            secret_key="legacy-service-role-jwt",
            supabase_url="https://project.supabase.co",
        )
        admin.invite_reader("reader@example.com")

    assert captured_request is not None
    assert captured_request.headers["apikey"] == "legacy-service-role-jwt"
    assert captured_request.headers["authorization"] == (
        "Bearer legacy-service-role-jwt"
    )
