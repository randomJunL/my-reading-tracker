import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.household import get_household_context
from app.database.session import get_db
from app.schemas.book_recommendations import (
    BookRecommendationCreate,
    BookRecommendationResponse,
)
from app.services.book_recommendations import (
    BookRecommendationConflictError,
    BookRecommendationNotFoundError,
    BookRecommendationService,
)
from app.services.households import HouseholdContext

router = APIRouter(prefix="/book-recommendations")


@router.get("", response_model=list[BookRecommendationResponse])
def list_book_recommendations(
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> list[BookRecommendationResponse]:
    return [
        BookRecommendationResponse.model_validate(recommendation)
        for recommendation in BookRecommendationService(session).list(
            context.household.id
        )
    ]


@router.post(
    "", response_model=BookRecommendationResponse, status_code=status.HTTP_201_CREATED
)
def create_book_recommendation(
    data: BookRecommendationCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> BookRecommendationResponse:
    try:
        recommendation = BookRecommendationService(session).create(
            context.household.id, data
        )
    except BookRecommendationConflictError as error:
        raise HTTPException(
            status_code=409, detail="This book is already recommended"
        ) from error
    return BookRecommendationResponse.model_validate(recommendation)


@router.delete("/{recommendation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book_recommendation(
    recommendation_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    try:
        BookRecommendationService(session).delete(
            recommendation_id, context.household.id
        )
    except BookRecommendationNotFoundError as error:
        raise HTTPException(
            status_code=404, detail="Recommendation not found"
        ) from error
    return Response(status_code=204)
