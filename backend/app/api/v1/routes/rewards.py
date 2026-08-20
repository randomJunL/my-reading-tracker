import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.household import (
    get_household_context,
    require_admin,
    require_reader_access,
)
from app.database.session import get_db
from app.schemas.rewards import (
    RedemptionAction,
    RedemptionCreate,
    RedemptionResponse,
    RewardItemCreate,
    RewardItemResponse,
    RewardItemUpdate,
    RewardProgressResponse,
    RewardTransactionResponse,
)
from app.services.households import HouseholdContext
from app.services.rewards import (
    InsufficientCreditsError,
    InvalidRedemptionTransitionError,
    RewardNotFoundError,
    RewardService,
    RewardUnavailableError,
)

router = APIRouter()


@router.get("/rewards/progress", response_model=RewardProgressResponse)
def get_reward_progress(
    reader_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> RewardProgressResponse:
    require_reader_access(reader_id, context)
    try:
        return RewardService(session).progress(reader_id, context.household.id)
    except RewardNotFoundError as error:
        raise _not_found() from error


@router.get("/rewards/transactions", response_model=list[RewardTransactionResponse])
def list_reward_transactions(
    reader_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> list[RewardTransactionResponse]:
    require_reader_access(reader_id, context)
    try:
        records = RewardService(session).transactions(reader_id, context.household.id)
    except RewardNotFoundError as error:
        raise _not_found() from error
    return [RewardTransactionResponse.model_validate(item) for item in records]


@router.get("/reward-items", response_model=list[RewardItemResponse])
def list_reward_items(
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
    include_inactive: bool = True,
) -> list[RewardItemResponse]:
    return [
        RewardItemResponse.model_validate(item)
        for item in RewardService(session).list_items(
            context.household.id,
            include_inactive=include_inactive,
        )
    ]


@router.post(
    "/reward-items",
    response_model=RewardItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_reward_item(
    data: RewardItemCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> RewardItemResponse:
    require_admin(context)
    return RewardItemResponse.model_validate(
        RewardService(session).create_item(context.household.id, data)
    )


@router.patch("/reward-items/{item_id}", response_model=RewardItemResponse)
def update_reward_item(
    item_id: uuid.UUID,
    data: RewardItemUpdate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> RewardItemResponse:
    require_admin(context)
    try:
        item = RewardService(session).update_item(item_id, context.household.id, data)
    except RewardNotFoundError as error:
        raise _not_found() from error
    return RewardItemResponse.model_validate(item)


@router.delete("/reward-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reward_item(
    item_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    require_admin(context)
    try:
        RewardService(session).delete_item(item_id, context.household.id)
    except RewardNotFoundError as error:
        raise _not_found() from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/reward-redemptions", response_model=list[RedemptionResponse])
def list_reward_redemptions(
    reader_id: uuid.UUID,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> list[RedemptionResponse]:
    require_reader_access(reader_id, context)
    try:
        records = RewardService(session).list_redemptions(
            reader_id, context.household.id
        )
    except RewardNotFoundError as error:
        raise _not_found() from error
    return [RedemptionResponse.model_validate(item) for item in records]


@router.post(
    "/reward-redemptions",
    response_model=RedemptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def redeem_reward(
    data: RedemptionCreate,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> RedemptionResponse:
    require_reader_access(data.reader_id, context)
    try:
        redemption = RewardService(session).redeem(context.household.id, data)
    except RewardNotFoundError as error:
        raise _not_found() from error
    except InsufficientCreditsError as error:
        raise HTTPException(
            status_code=409, detail="Not enough reward credits"
        ) from error
    except RewardUnavailableError as error:
        raise HTTPException(
            status_code=409, detail="This gift is not currently available"
        ) from error
    return RedemptionResponse.model_validate(redemption)


@router.patch("/reward-redemptions/{redemption_id}", response_model=RedemptionResponse)
def transition_redemption(
    redemption_id: uuid.UUID,
    data: RedemptionAction,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> RedemptionResponse:
    require_admin(context)
    try:
        redemption = RewardService(session).transition_redemption(
            redemption_id, context.household.id, data
        )
    except RewardNotFoundError as error:
        raise _not_found() from error
    except InvalidRedemptionTransitionError as error:
        raise HTTPException(
            status_code=409, detail="That redemption status change is not allowed"
        ) from error
    return RedemptionResponse.model_validate(redemption)


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Reward record not found")
