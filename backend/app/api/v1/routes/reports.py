import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies.household import get_household_context, require_reader_access
from app.database.session import get_db
from app.schemas.reports import CalendarReportResponse, ReportSummaryResponse
from app.services.households import HouseholdContext
from app.services.reports import ReportReaderNotFoundError, ReportService

router = APIRouter(prefix="/reports")


@router.get("/summary", response_model=ReportSummaryResponse)
def get_report_summary(
    reader_id: uuid.UUID,
    date_from: date,
    date_to: date,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> ReportSummaryResponse:
    require_reader_access(reader_id, context)
    _validate_dates(date_from, date_to)
    try:
        return ReportService(session).summary(
            context.household.id, reader_id, date_from, date_to
        )
    except ReportReaderNotFoundError as error:
        raise _not_found() from error


@router.get("/calendar", response_model=CalendarReportResponse)
def get_calendar_report(
    reader_id: uuid.UUID,
    date_from: date,
    date_to: date,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> CalendarReportResponse:
    require_reader_access(reader_id, context)
    _validate_dates(date_from, date_to)
    try:
        return ReportService(session).calendar(
            context.household.id, reader_id, date_from, date_to
        )
    except ReportReaderNotFoundError as error:
        raise _not_found() from error


def _validate_dates(date_from: date, date_to: date) -> None:
    if date_to < date_from:
        raise HTTPException(
            status_code=422, detail="date_to cannot be before date_from"
        )


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Reader not found")
