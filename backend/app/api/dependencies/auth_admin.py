from collections.abc import Generator
from typing import Annotated

import httpx
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.integrations.auth.supabase_admin import SupabaseAuthAdmin


def get_supabase_auth_admin(
    settings: Annotated[Settings, Depends(get_settings)],
) -> Generator[SupabaseAuthAdmin, None, None]:
    with httpx.Client(timeout=10) as client:
        yield SupabaseAuthAdmin(
            client=client,
            frontend_url=settings.frontend_url,
            secret_key=settings.supabase_secret_key,
            supabase_url=settings.supabase_url,
        )
