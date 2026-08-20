import uuid
from collections.abc import Generator
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.security import AuthenticatedUser
from app.database.session import get_db
from app.main import app
from app.models import Household, Reader, RewardItem, RewardTransaction


@pytest.fixture
def reward_client(db_session: Session) -> Generator[TestClient, None, None]:
    user = AuthenticatedUser(
        id=uuid.uuid4(), email="rewards@example.com", session_id=uuid.uuid4()
    )

    def override_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


def test_sessions_award_permanent_badges_and_session_credits_once(
    reward_client: TestClient, db_session: Session
) -> None:
    reader, book = _create_library(reward_client)
    today = date.today()
    for offset in range(7):
        response = reward_client.post(
            "/api/v1/reading-sessions",
            json={
                "reader_id": reader["id"],
                "book_id": book["id"],
                "session_date": (today - timedelta(days=6 - offset)).isoformat(),
                "minutes": 10,
                "activity_type": "independent",
                "finished_book": offset == 6,
            },
        )
        assert response.status_code == 201

    progress = reward_client.get(
        "/api/v1/rewards/progress", params={"reader_id": reader["id"]}
    )
    assert progress.status_code == 200
    data = progress.json()
    assert data["finished_books"] == 1
    assert data["current_continuous_days"] == 7
    assert data["longest_continuous_days"] == 7
    earned = {badge["code"] for badge in data["badges"] if badge["earned"]}
    assert {"first-book", "three-day-reader", "one-week-reader"} <= earned
    first_balance = data["credit_balance"]
    earned_credit_value = sum(
        badge["credit_value"] for badge in data["badges"] if badge["earned"]
    )
    assert first_balance == 7 + earned_credit_value

    second = reward_client.get(
        "/api/v1/rewards/progress", params={"reader_id": reader["id"]}
    ).json()
    assert second["credit_balance"] == first_balance
    session_transactions = db_session.scalars(
        select(RewardTransaction).where(
            RewardTransaction.reader_id == uuid.UUID(reader["id"]),
            RewardTransaction.transaction_type == "reading_session",
        )
    ).all()
    assert len(session_transactions) == 7
    assert len(
        {transaction.idempotency_key for transaction in session_transactions}
    ) == len(session_transactions)
    badge_transactions = db_session.scalars(
        select(RewardTransaction).where(
            RewardTransaction.reader_id == uuid.UUID(reader["id"]),
            RewardTransaction.transaction_type == "badge_award",
        )
    ).all()
    assert sum(transaction.amount for transaction in badge_transactions) == (
        earned_credit_value
    )
    assert len({item.idempotency_key for item in badge_transactions}) == len(
        badge_transactions
    )


def test_session_credits_are_capped_at_two_per_calendar_day(
    reward_client: TestClient, db_session: Session
) -> None:
    reader, book = _create_library(reward_client)
    session_ids = []
    for minutes in (10, 15, 20):
        response = reward_client.post(
            "/api/v1/reading-sessions",
            json={
                "reader_id": reader["id"],
                "book_id": book["id"],
                "session_date": date.today().isoformat(),
                "minutes": minutes,
                "activity_type": "independent",
            },
        )
        assert response.status_code == 201
        session_ids.append(response.json()["id"])

    progress_url = "/api/v1/rewards/progress"
    params = {"reader_id": reader["id"]}
    assert reward_client.get(progress_url, params=params).json()["credit_balance"] == 2
    transactions = db_session.scalars(
        select(RewardTransaction).where(
            RewardTransaction.reader_id == uuid.UUID(reader["id"]),
            RewardTransaction.transaction_type == "reading_session",
        )
    ).all()
    assert len(transactions) == 2
    assert {transaction.amount for transaction in transactions} == {1}

    assert (
        reward_client.delete(f"/api/v1/reading-sessions/{session_ids[0]}").status_code
        == 204
    )
    assert reward_client.get(progress_url, params=params).json()["credit_balance"] == 2


def test_gift_redemption_spends_and_refunds_credits(
    reward_client: TestClient, db_session: Session
) -> None:
    reader, book = _create_library(reward_client)
    finished = reward_client.post(
        "/api/v1/reading-sessions",
        json={
            "reader_id": reader["id"],
            "book_id": book["id"],
            "session_date": date.today().isoformat(),
            "minutes": 10,
            "activity_type": "independent",
        },
    )
    assert finished.status_code == 201
    gift = reward_client.post(
        "/api/v1/reward-items",
        json={
            "name": "Choose dessert",
            "credit_cost": 1,
            "quantity": 2,
        },
    )
    assert gift.status_code == 201

    redemption = reward_client.post(
        "/api/v1/reward-redemptions",
        json={"reader_id": reader["id"], "reward_item_id": gift.json()["id"]},
    )
    assert redemption.status_code == 201
    assert redemption.json()["status"] == "pending"
    updated = reward_client.patch(
        f"/api/v1/reward-items/{gift.json()['id']}",
        json={
            "name": "Choose a movie",
            "description": "Family movie night",
            "credit_cost": 5,
            "quantity": 4,
            "active": False,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Choose a movie"
    snapshot = reward_client.get(
        "/api/v1/reward-redemptions", params={"reader_id": reader["id"]}
    ).json()[0]
    assert snapshot["reward_name"] == "Choose dessert"
    assert snapshot["credit_cost"] == 1
    balance_after_spend = reward_client.get(
        "/api/v1/rewards/progress", params={"reader_id": reader["id"]}
    ).json()["credit_balance"]
    assert balance_after_spend == 0

    rejected = reward_client.patch(
        f"/api/v1/reward-redemptions/{redemption.json()['id']}",
        json={"status": "rejected", "parent_notes": "Try again next week"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    balance_after_refund = reward_client.get(
        "/api/v1/rewards/progress", params={"reader_id": reader["id"]}
    ).json()["credit_balance"]
    assert balance_after_refund == 1
    assert (
        reward_client.delete(f"/api/v1/reward-items/{gift.json()['id']}").status_code
        == 204
    )
    assert reward_client.get("/api/v1/reward-items").json() == []
    history = reward_client.get(
        "/api/v1/reward-redemptions", params={"reader_id": reader["id"]}
    ).json()
    assert history[0]["reward_name"] == "Choose dessert"
    deleted = db_session.get(RewardItem, uuid.UUID(gift.json()["id"]))
    assert deleted is not None
    assert deleted.active is False
    assert deleted.deleted_at is not None
    unavailable = reward_client.post(
        "/api/v1/reward-redemptions",
        json={"reader_id": reader["id"], "reward_item_id": gift.json()["id"]},
    )
    assert unavailable.status_code == 404


def test_unused_gift_is_soft_deleted(
    reward_client: TestClient, db_session: Session
) -> None:
    gift = reward_client.post(
        "/api/v1/reward-items",
        json={"name": "Choose a game", "credit_cost": 2},
    )
    assert gift.status_code == 201

    assert (
        reward_client.delete(f"/api/v1/reward-items/{gift.json()['id']}").status_code
        == 204
    )
    assert reward_client.get("/api/v1/reward-items").json() == []
    deleted = db_session.get(RewardItem, uuid.UUID(gift.json()["id"]))
    assert deleted is not None
    assert deleted.deleted_at is not None


def test_rewards_are_household_scoped(
    reward_client: TestClient, db_session: Session
) -> None:
    hidden_household = Household(name="Hidden")
    hidden_reader = Reader(household=hidden_household, name="Hidden reader")
    db_session.add(hidden_household)
    db_session.flush()
    hidden_item = RewardItem(
        household_id=hidden_household.id,
        name="Hidden gift",
        credit_cost=1,
        active=True,
    )
    db_session.add_all([hidden_reader, hidden_item])
    db_session.commit()

    assert (
        reward_client.get(
            "/api/v1/rewards/progress",
            params={"reader_id": str(hidden_reader.id)},
        ).status_code
        == 404
    )
    assert (
        reward_client.patch(
            f"/api/v1/reward-items/{hidden_item.id}", json={"name": "Exposed"}
        ).status_code
        == 404
    )


def _create_library(client: TestClient) -> tuple[dict[str, str], dict[str, str]]:
    reader = client.post("/api/v1/readers", json={"name": "Maya"}).json()
    book = client.post(
        "/api/v1/books",
        json={"title": "Reward Book", "metadata_source": "manual"},
    ).json()
    assigned = client.post(
        f"/api/v1/readers/{reader['id']}/books",
        json={"book_id": book["id"], "status": "planned"},
    )
    assert assigned.status_code == 201
    return reader, book
