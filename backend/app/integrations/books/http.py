import asyncio
import logging
from typing import Any

import httpx

from app.integrations.books.base import BookProviderUnavailableError

logger = logging.getLogger("my_reading_tracker.book_provider")


async def get_json(
    client: httpx.AsyncClient,
    url: str,
    *,
    params: dict[str, str | int],
    headers: dict[str, str] | None = None,
    provider_name: str,
    max_retries: int,
) -> dict[str, Any]:
    for attempt in range(max_retries + 1):
        try:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 429 or response.status_code >= 500:
                raise httpx.HTTPStatusError(
                    "Retryable provider response",
                    request=response.request,
                    response=response,
                )
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("Provider response must be an object")
            return payload
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as error:
            retryable = _is_retryable(error)
            if attempt < max_retries and retryable:
                await asyncio.sleep(0.1 * (2**attempt))
                continue
            logger.warning(
                "book_provider_unavailable",
                extra={
                    "provider": provider_name,
                    "attempts": attempt + 1,
                    "status_code": _status_code(error),
                },
            )
            raise BookProviderUnavailableError(provider_name) from error

    raise BookProviderUnavailableError(provider_name)


def _is_retryable(error: Exception) -> bool:
    if isinstance(error, httpx.RequestError):
        return True
    if isinstance(error, httpx.HTTPStatusError):
        return error.response.status_code == 429 or error.response.status_code >= 500
    return False


def _status_code(error: Exception) -> int | None:
    if isinstance(error, httpx.HTTPStatusError):
        return error.response.status_code
    return None
