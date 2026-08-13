import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from itertools import pairwise

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    BadgeCategory,
    BadgeDefinition,
    Reader,
    ReaderBadge,
    ReaderBook,
    ReaderRewardProgress,
    ReadingSession,
    ReadingStatus,
    RedemptionStatus,
    RewardItem,
    RewardRedemption,
    RewardTransaction,
    RewardTransactionType,
)
from app.schemas.rewards import (
    BadgeProgress,
    RedemptionAction,
    RedemptionCreate,
    RewardItemCreate,
    RewardItemUpdate,
    RewardProgressResponse,
)


class RewardNotFoundError(Exception):
    pass


class InsufficientCreditsError(Exception):
    pass


class RewardUnavailableError(Exception):
    pass


class InvalidRedemptionTransitionError(Exception):
    pass


class RewardService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def progress(
        self, reader_id: uuid.UUID, household_id: uuid.UUID
    ) -> RewardProgressResponse:
        snapshot = self.evaluate(reader_id, household_id)
        definitions = list(
            self.session.scalars(
                select(BadgeDefinition)
                .where(BadgeDefinition.active.is_(True))
                .order_by(BadgeDefinition.display_order)
            )
        )
        earned = {
            item.badge_definition_id: item
            for item in self.session.scalars(
                select(ReaderBadge).where(
                    ReaderBadge.reader_id == reader_id,
                    ReaderBadge.revoked_at.is_(None),
                )
            )
        }
        values = _category_values(snapshot, self._max_week_reading_days(reader_id))
        badges = []
        for definition in definitions:
            award = earned.get(definition.id)
            current = values.get(definition.category, 0)
            badges.append(
                BadgeProgress(
                    badge_id=definition.id,
                    code=definition.code,
                    name=definition.name,
                    description=definition.description,
                    category=definition.category,
                    threshold=definition.threshold,
                    current_value=current,
                    earned=award is not None,
                    earned_at=award.earned_at if award else None,
                    progress_percent=round(
                        min(current / definition.threshold * 100, 100), 1
                    ),
                    credit_value=definition.credit_value,
                )
            )
        return RewardProgressResponse(
            reader_id=reader_id,
            credit_balance=self.balance(reader_id),
            finished_books=snapshot.finished_books,
            current_week_reading_days=snapshot.current_week_reading_days,
            current_weekly_streak=snapshot.current_weekly_streak,
            longest_weekly_streak=snapshot.longest_weekly_streak,
            current_continuous_days=snapshot.current_continuous_days,
            longest_continuous_days=snapshot.longest_continuous_days,
            badges=badges,
        )

    def evaluate(
        self,
        reader_id: uuid.UUID,
        household_id: uuid.UUID,
        *,
        today: date | None = None,
    ) -> ReaderRewardProgress:
        self._require_reader(reader_id, household_id, lock=True)
        evaluation_date = today or date.today()
        reading_dates = list(
            self.session.scalars(
                select(ReadingSession.session_date)
                .where(ReadingSession.reader_id == reader_id)
                .distinct()
                .order_by(ReadingSession.session_date)
            )
        )
        finished_books = int(
            self.session.scalar(
                select(func.count())
                .select_from(ReaderBook)
                .where(
                    ReaderBook.reader_id == reader_id,
                    ReaderBook.status == ReadingStatus.FINISHED,
                )
            )
            or 0
        )
        daily_current, daily_longest = continuous_runs(reading_dates, evaluation_date)
        weekly_days = reading_days_by_week(reading_dates)
        weekly_current, weekly_longest = weekly_runs(weekly_days, evaluation_date)
        current_week = evaluation_date - timedelta(days=evaluation_date.weekday())
        snapshot = self.session.get(ReaderRewardProgress, reader_id)
        if snapshot is None:
            snapshot = ReaderRewardProgress(
                reader_id=reader_id,
                current_continuous_days=0,
                longest_continuous_days=0,
                current_weekly_streak=0,
                longest_weekly_streak=0,
                current_week_reading_days=0,
                finished_books=0,
                evaluated_at=datetime.now(UTC),
            )
            self.session.add(snapshot)
        snapshot.current_continuous_days = daily_current
        snapshot.longest_continuous_days = max(
            snapshot.longest_continuous_days, daily_longest
        )
        snapshot.current_weekly_streak = weekly_current
        snapshot.longest_weekly_streak = max(
            snapshot.longest_weekly_streak, weekly_longest
        )
        snapshot.current_week_reading_days = weekly_days.get(current_week, 0)
        snapshot.finished_books = finished_books
        snapshot.evaluated_at = datetime.now(UTC)
        self.session.flush()
        self._award_session_credits(reader_id)
        self._award_badges(reader_id, snapshot, max(weekly_days.values(), default=0))
        self.session.commit()
        return snapshot

    def balance(self, reader_id: uuid.UUID) -> int:
        return int(
            self.session.scalar(
                select(func.coalesce(func.sum(RewardTransaction.amount), 0)).where(
                    RewardTransaction.reader_id == reader_id
                )
            )
            or 0
        )

    def list_items(
        self, household_id: uuid.UUID, *, include_inactive: bool = True
    ) -> list[RewardItem]:
        statement = select(RewardItem).where(RewardItem.household_id == household_id)
        if not include_inactive:
            statement = statement.where(RewardItem.active.is_(True))
        return list(self.session.scalars(statement.order_by(RewardItem.created_at)))

    def create_item(
        self, household_id: uuid.UUID, data: RewardItemCreate
    ) -> RewardItem:
        item = RewardItem(household_id=household_id, **data.model_dump())
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def update_item(
        self, item_id: uuid.UUID, household_id: uuid.UUID, data: RewardItemUpdate
    ) -> RewardItem:
        item = self._item(item_id, household_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        self.session.commit()
        self.session.refresh(item)
        return item

    def retire_item(self, item_id: uuid.UUID, household_id: uuid.UUID) -> None:
        item = self._item(item_id, household_id)
        item.active = False
        self.session.commit()

    def list_redemptions(
        self, reader_id: uuid.UUID, household_id: uuid.UUID
    ) -> list[RewardRedemption]:
        self._require_reader(reader_id, household_id)
        return list(
            self.session.scalars(
                select(RewardRedemption)
                .where(RewardRedemption.reader_id == reader_id)
                .order_by(RewardRedemption.requested_at.desc())
            )
        )

    def redeem(
        self, household_id: uuid.UUID, data: RedemptionCreate
    ) -> RewardRedemption:
        self._require_reader(data.reader_id, household_id, lock=True)
        item = self._item(data.reward_item_id, household_id, lock=True)
        if not item.active or item.quantity == 0:
            raise RewardUnavailableError
        if self.balance(data.reader_id) < item.credit_cost:
            raise InsufficientCreditsError
        now = datetime.now(UTC)
        redemption = RewardRedemption(
            reader_id=data.reader_id,
            reward_item_id=item.id,
            reward_name=item.name,
            credit_cost=item.credit_cost,
            status=RedemptionStatus.PENDING.value,
            requested_at=now,
        )
        self.session.add(redemption)
        self.session.flush()
        self._add_transaction(
            data.reader_id,
            -item.credit_cost,
            RewardTransactionType.REDEMPTION,
            redemption.id,
            f"Redeemed {item.name}",
            f"redemption:{redemption.id}:spend",
            now,
        )
        if item.quantity is not None:
            item.quantity -= 1
        self.session.commit()
        self.session.refresh(redemption)
        return redemption

    def transition_redemption(
        self,
        redemption_id: uuid.UUID,
        household_id: uuid.UUID,
        data: RedemptionAction,
    ) -> RewardRedemption:
        redemption = self._redemption(redemption_id, household_id)
        current = RedemptionStatus(redemption.status)
        target = RedemptionStatus(data.status)
        allowed = {
            RedemptionStatus.PENDING: {
                RedemptionStatus.APPROVED,
                RedemptionStatus.REJECTED,
                RedemptionStatus.CANCELLED,
            },
            RedemptionStatus.APPROVED: {
                RedemptionStatus.FULFILLED,
                RedemptionStatus.CANCELLED,
            },
        }
        if target not in allowed.get(current, set()):
            raise InvalidRedemptionTransitionError
        now = datetime.now(UTC)
        redemption.status = target.value
        redemption.parent_notes = data.parent_notes
        if target is RedemptionStatus.APPROVED:
            redemption.approved_at = now
        elif target is RedemptionStatus.FULFILLED:
            redemption.fulfilled_at = now
        elif target in {RedemptionStatus.REJECTED, RedemptionStatus.CANCELLED}:
            redemption.cancelled_at = now
            self._add_transaction(
                redemption.reader_id,
                redemption.credit_cost,
                RewardTransactionType.REFUND,
                redemption.id,
                f"Refunded {redemption.reward_name}",
                f"redemption:{redemption.id}:refund",
                now,
            )
            item = self.session.get(RewardItem, redemption.reward_item_id)
            if item is not None and item.quantity is not None:
                item.quantity += 1
        self.session.commit()
        self.session.refresh(redemption)
        return redemption

    def transactions(
        self, reader_id: uuid.UUID, household_id: uuid.UUID
    ) -> list[RewardTransaction]:
        self._require_reader(reader_id, household_id)
        return list(
            self.session.scalars(
                select(RewardTransaction)
                .where(RewardTransaction.reader_id == reader_id)
                .order_by(RewardTransaction.created_at.desc())
            )
        )

    def _award_badges(
        self,
        reader_id: uuid.UUID,
        snapshot: ReaderRewardProgress,
        max_week_days: int,
    ) -> None:
        values = _category_values(snapshot, max_week_days)
        definitions = list(
            self.session.scalars(
                select(BadgeDefinition).where(BadgeDefinition.active.is_(True))
            )
        )
        existing = set(
            self.session.scalars(
                select(ReaderBadge.badge_definition_id).where(
                    ReaderBadge.reader_id == reader_id
                )
            )
        )
        now = datetime.now(UTC)
        for definition in definitions:
            value = values.get(definition.category, 0)
            if definition.id in existing or value < definition.threshold:
                continue
            award = ReaderBadge(
                reader_id=reader_id,
                badge_definition_id=definition.id,
                earned_at=now,
                progress_value=value,
            )
            self.session.add(award)

    def _award_session_credits(self, reader_id: uuid.UUID) -> None:
        sessions = self.session.execute(
            select(ReadingSession.id, ReadingSession.session_date)
            .where(ReadingSession.reader_id == reader_id)
            .order_by(
                ReadingSession.session_date,
                ReadingSession.created_at,
                ReadingSession.id,
            )
        ).all()
        sessions_by_date: dict[date, list[uuid.UUID]] = defaultdict(list)
        for session_id, session_date in sessions:
            sessions_by_date[session_date].append(session_id)

        now = datetime.now(UTC)
        for session_date, session_ids in sessions_by_date.items():
            for slot, session_id in enumerate(session_ids[:2], start=1):
                key = f"reading-session:{reader_id}:{session_date.isoformat()}:{slot}"
                if self.session.scalar(
                    select(RewardTransaction.id).where(
                        RewardTransaction.idempotency_key == key
                    )
                ):
                    continue
                self._add_transaction(
                    reader_id,
                    1,
                    RewardTransactionType.READING_SESSION,
                    session_id,
                    f"Logged reading session ({slot} of 2 for the day)",
                    key,
                    now,
                )

    def _add_transaction(
        self,
        reader_id: uuid.UUID,
        amount: int,
        transaction_type: RewardTransactionType,
        source_id: uuid.UUID | None,
        description: str,
        idempotency_key: str,
        created_at: datetime,
    ) -> None:
        self.session.add(
            RewardTransaction(
                reader_id=reader_id,
                amount=amount,
                transaction_type=transaction_type.value,
                source_id=source_id,
                description=description,
                idempotency_key=idempotency_key,
                created_at=created_at,
            )
        )

    def _max_week_reading_days(self, reader_id: uuid.UUID) -> int:
        dates = list(
            self.session.scalars(
                select(ReadingSession.session_date)
                .where(ReadingSession.reader_id == reader_id)
                .distinct()
            )
        )
        return max(reading_days_by_week(dates).values(), default=0)

    def _require_reader(
        self, reader_id: uuid.UUID, household_id: uuid.UUID, *, lock: bool = False
    ) -> None:
        statement = select(Reader.id).where(
            Reader.id == reader_id, Reader.household_id == household_id
        )
        if lock:
            statement = statement.with_for_update()
        if self.session.scalar(statement) is None:
            raise RewardNotFoundError

    def _item(
        self, item_id: uuid.UUID, household_id: uuid.UUID, *, lock: bool = False
    ) -> RewardItem:
        statement = select(RewardItem).where(
            RewardItem.id == item_id,
            RewardItem.household_id == household_id,
        )
        if lock:
            statement = statement.with_for_update()
        item = self.session.scalar(statement)
        if item is None:
            raise RewardNotFoundError
        return item

    def _redemption(
        self, redemption_id: uuid.UUID, household_id: uuid.UUID
    ) -> RewardRedemption:
        redemption = self.session.scalar(
            select(RewardRedemption)
            .join(Reader)
            .where(
                RewardRedemption.id == redemption_id,
                Reader.household_id == household_id,
            )
        )
        if redemption is None:
            raise RewardNotFoundError
        return redemption


def continuous_runs(reading_dates: list[date], today: date) -> tuple[int, int]:
    unique = sorted(set(reading_dates))
    if not unique:
        return 0, 0
    longest = run = 1
    for previous, current in pairwise(unique):
        run = run + 1 if current == previous + timedelta(days=1) else 1
        longest = max(longest, run)
    current_run = run if unique[-1] >= today - timedelta(days=1) else 0
    return current_run, longest


def reading_days_by_week(reading_dates: list[date]) -> dict[date, int]:
    weeks: dict[date, set[date]] = defaultdict(set)
    for reading_date in set(reading_dates):
        week = reading_date - timedelta(days=reading_date.weekday())
        weeks[week].add(reading_date)
    return {week: len(days) for week, days in weeks.items()}


def weekly_runs(weekly_days: dict[date, int], today: date) -> tuple[int, int]:
    successful = sorted(week for week, days in weekly_days.items() if days >= 3)
    if not successful:
        return 0, 0
    longest = run = 1
    for previous, current in pairwise(successful):
        run = run + 1 if current == previous + timedelta(days=7) else 1
        longest = max(longest, run)
    current_week = today - timedelta(days=today.weekday())
    anchor = (
        current_week if current_week in successful else current_week - timedelta(days=7)
    )
    current_run = 0
    while anchor in successful:
        current_run += 1
        anchor -= timedelta(days=7)
    return current_run, longest


def _category_values(
    snapshot: ReaderRewardProgress, max_week_days: int
) -> dict[str, int]:
    return {
        BadgeCategory.BOOKS_FINISHED.value: snapshot.finished_books,
        BadgeCategory.WEEKLY_CONSISTENCY.value: max_week_days,
        BadgeCategory.WEEKLY_STREAK.value: snapshot.longest_weekly_streak,
        BadgeCategory.CONTINUOUS_DAYS.value: snapshot.longest_continuous_days,
    }
