import httpx


class InvitationEmailError(Exception):
    pass


class SupabaseAuthAdmin:
    def __init__(
        self,
        *,
        client: httpx.Client,
        frontend_url: str,
        secret_key: str,
        supabase_url: str,
    ) -> None:
        self.client = client
        self.frontend_url = frontend_url.rstrip("/")
        self.secret_key = secret_key
        self.supabase_url = supabase_url.rstrip("/")

    def invite_reader(self, email: str) -> None:
        if not self.supabase_url or not self.secret_key:
            raise InvitationEmailError("Supabase invitation email is not configured")

        headers = {"apikey": self.secret_key}
        if not self.secret_key.startswith("sb_secret_"):
            headers["Authorization"] = f"Bearer {self.secret_key}"

        try:
            response = self.client.post(
                f"{self.supabase_url}/auth/v1/invite",
                params={"redirect_to": f"{self.frontend_url}/accept-invite"},
                headers=headers,
                json={"email": email, "data": {"account_type": "reader"}},
            )
            response.raise_for_status()
        except (httpx.HTTPError, ValueError) as error:
            raise InvitationEmailError(
                "Supabase could not send the invitation email"
            ) from error
