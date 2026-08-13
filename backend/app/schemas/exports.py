import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models import ActivityType, MetadataSource, ReadingStatus


class ExportReader(BaseModel):
    id: uuid.UUID
    name: str
    avatar_key: str | None
    created_at: datetime
    updated_at: datetime


class ExportBook(BaseModel):
    id: uuid.UUID
    title: str
    subtitle: str | None
    authors: list[str]
    isbn_10: str | None
    isbn_13: str | None
    cover_url: str | None
    publisher: str | None
    published_date: str | None
    page_count: int | None
    description: str | None
    language: str | None
    metadata_source: MetadataSource
    external_source_id: str | None
    created_at: datetime
    updated_at: datetime


class ExportReaderBook(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID
    book_id: uuid.UUID
    status: ReadingStatus
    started_at: date | None
    finished_at: date | None
    created_at: datetime
    updated_at: datetime


class ExportReadingSession(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID
    book_id: uuid.UUID
    session_date: date
    minutes: int
    start_page: int | None
    end_page: int | None
    activity_type: ActivityType
    notes: str | None
    finished_book: bool
    created_at: datetime
    updated_at: datetime


class ExportBadgeDefinition(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str
    category: str
    threshold: int
    icon_key: str
    credit_value: int
    display_order: int
    active: bool


class ExportReaderBadge(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID
    badge_definition_id: uuid.UUID
    earned_at: datetime
    progress_value: int
    revoked_at: datetime | None
    revocation_reason: str | None


class ExportRewardItem(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    description: str | None
    credit_cost: int
    image_url: str | None
    quantity: int | None
    active: bool
    created_at: datetime
    updated_at: datetime


class ExportRewardTransaction(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID
    amount: int
    transaction_type: str
    source_id: uuid.UUID | None
    description: str
    idempotency_key: str
    created_at: datetime


class ExportRewardRedemption(BaseModel):
    id: uuid.UUID
    reader_id: uuid.UUID
    reward_item_id: uuid.UUID
    reward_name: str
    credit_cost: int
    status: str
    requested_at: datetime
    approved_at: datetime | None
    fulfilled_at: datetime | None
    cancelled_at: datetime | None
    parent_notes: str | None
    created_at: datetime
    updated_at: datetime


class ReadingDataExport(BaseModel):
    schema_version: int = 2
    exported_at: datetime
    household_id: uuid.UUID
    household_name: str
    readers: list[ExportReader]
    books: list[ExportBook]
    reader_books: list[ExportReaderBook]
    reading_sessions: list[ExportReadingSession]
    badge_definitions: list[ExportBadgeDefinition]
    reader_badges: list[ExportReaderBadge]
    reward_items: list[ExportRewardItem]
    reward_transactions: list[ExportRewardTransaction]
    reward_redemptions: list[ExportRewardRedemption]
