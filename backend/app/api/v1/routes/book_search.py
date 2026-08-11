import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.book_search import get_book_search_service
from app.core.security import AuthenticatedUser
from app.integrations.books import BookSearchQuery
from app.schemas.book_search import (
    BookSearchParameters,
    BookSearchResult,
)
from app.services.book_search import BookSearchService, BookSearchUnavailableError

router = APIRouter(prefix="/book-search")


@router.get("", response_model=list[BookSearchResult])
async def search_books(
    parameters: Annotated[BookSearchParameters, Depends()],
    _: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[BookSearchService, Depends(get_book_search_service)],
) -> list[BookSearchResult]:
    if not any((parameters.q, parameters.title, parameters.author)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Provide q, title, or author",
        )
    query = BookSearchQuery(
        text=parameters.q,
        title=parameters.title,
        author=parameters.author,
    )
    return await _search(service, query, parameters.limit)


@router.get("/isbn/{isbn}", response_model=list[BookSearchResult])
async def search_book_by_isbn(
    isbn: Annotated[str, Path(min_length=10, max_length=20)],
    _: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[BookSearchService, Depends(get_book_search_service)],
) -> list[BookSearchResult]:
    normalized_isbn = re.sub(r"[-\s]", "", isbn).upper()
    if not re.fullmatch(r"(?:\d{13}|\d{9}[\dX])", normalized_isbn):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="ISBN must contain 10 or 13 valid characters",
        )
    return await _search(service, BookSearchQuery(isbn=normalized_isbn), 10)


async def _search(
    service: BookSearchService, query: BookSearchQuery, limit: int
) -> list[BookSearchResult]:
    try:
        return await service.search(query, limit=limit)
    except BookSearchUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Book search is temporarily unavailable. "
                "You can try again or add the book manually."
            ),
        ) from error
