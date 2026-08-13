import uuid
from datetime import date

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    ActivityType,
    Book,
    Household,
    HouseholdMember,
    HouseholdRole,
    MetadataSource,
    Reader,
    ReaderBook,
    ReadingSession,
    ReadingStatus,
)


def test_migration_builds_complete_schema(db_session: Session) -> None:
    table_names = set(inspect(db_session.get_bind()).get_table_names())

    assert table_names == {
        "alembic_version",
        "badge_definitions",
        "books",
        "household_members",
        "households",
        "reader_books",
        "reader_badges",
        "reader_reward_progress",
        "readers",
        "reading_sessions",
        "reward_items",
        "reward_redemptions",
        "reward_transactions",
    }


def test_models_persist_with_server_generated_fields(db_session: Session) -> None:
    household, reader, book = _create_library(db_session)
    membership = HouseholdMember(
        household_id=household.id,
        user_id=uuid.uuid4(),
        role=HouseholdRole.OWNER,
    )
    reader_book = ReaderBook(
        reader_id=reader.id,
        book_id=book.id,
        status=ReadingStatus.READING,
        started_at=date(2026, 8, 1),
    )
    reading_session = ReadingSession(
        reader_id=reader.id,
        book_id=book.id,
        session_date=date(2026, 8, 4),
        minutes=20,
        start_page=5,
        end_page=18,
        activity_type=ActivityType.WITH_ADULT,
    )
    db_session.add_all([membership, reader_book, reading_session])
    db_session.commit()
    db_session.expire_all()

    assert all(record.id is not None for record in (household, reader, book))
    assert all(
        record.created_at.tzinfo is not None for record in (household, reader, book)
    )
    assert reading_session.id is not None
    assert reading_session.finished_book is False
    assert membership.role is HouseholdRole.OWNER
    assert book.metadata_source is MetadataSource.MANUAL
    assert reader_book.status is ReadingStatus.READING
    assert reading_session.activity_type is ActivityType.WITH_ADULT


@pytest.mark.parametrize("role", ["stranger", "child"])
def test_invalid_household_roles_are_rejected(db_session: Session, role: str) -> None:
    household = Household(name="Constraint Test")
    db_session.add(household)
    db_session.commit()

    with pytest.raises(IntegrityError):
        db_session.execute(
            text(
                "INSERT INTO household_members (household_id, user_id, role) "
                "VALUES (:household_id, :user_id, :role)"
            ),
            {"household_id": household.id, "user_id": uuid.uuid4(), "role": role},
        )
        db_session.commit()


def test_invalid_page_count_is_rejected(db_session: Session) -> None:
    household = Household(name="Constraint Test")
    db_session.add(household)
    db_session.commit()

    with pytest.raises(IntegrityError):
        db_session.add(
            Book(
                household_id=household.id,
                title="Impossible Book",
                authors=[],
                page_count=0,
                metadata_source=MetadataSource.MANUAL,
            )
        )
        db_session.commit()


@pytest.mark.parametrize("status", ["paused", "stopped"])
def test_invalid_reader_book_statuses_are_rejected(
    db_session: Session, status: str
) -> None:
    _, reader, book = _create_library(db_session)

    with pytest.raises(IntegrityError):
        db_session.execute(
            text(
                "INSERT INTO reader_books (reader_id, book_id, status) "
                "VALUES (:reader_id, :book_id, :status)"
            ),
            {"reader_id": reader.id, "book_id": book.id, "status": status},
        )
        db_session.commit()


def test_duplicate_reader_books_are_rejected(db_session: Session) -> None:
    _, reader, book = _create_library(db_session)
    db_session.add(
        ReaderBook(reader_id=reader.id, book_id=book.id, status=ReadingStatus.PLANNED)
    )
    db_session.commit()

    with pytest.raises(IntegrityError):
        db_session.add(
            ReaderBook(
                reader_id=reader.id, book_id=book.id, status=ReadingStatus.READING
            )
        )
        db_session.commit()


@pytest.mark.parametrize(
    ("minutes", "start_page", "end_page"),
    [(0, None, None), (-1, None, None), (10, -1, 5), (10, 10, 9)],
)
def test_invalid_reading_session_values_are_rejected(
    db_session: Session,
    minutes: int,
    start_page: int | None,
    end_page: int | None,
) -> None:
    _, reader, book = _create_library(db_session)

    with pytest.raises(IntegrityError):
        db_session.add(
            ReadingSession(
                reader_id=reader.id,
                book_id=book.id,
                session_date=date(2026, 8, 4),
                minutes=minutes,
                start_page=start_page,
                end_page=end_page,
                activity_type=ActivityType.INDEPENDENT,
            )
        )
        db_session.commit()


def _create_library(session: Session) -> tuple[Household, Reader, Book]:
    household = Household(name="The Readers")
    session.add(household)
    session.flush()
    reader = Reader(household_id=household.id, name="Sam")
    book = Book(
        household_id=household.id,
        title="A Good Book",
        authors=["A. Writer"],
        page_count=120,
        metadata_source=MetadataSource.MANUAL,
    )
    session.add_all([reader, book])
    session.commit()
    return household, reader, book
