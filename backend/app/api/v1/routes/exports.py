import re
import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.dependencies.household import get_household_context
from app.database.session import get_db
from app.schemas.exports import ReadingDataExport
from app.services.exports import ExportService
from app.services.households import HouseholdContext
from app.services.school_report_pdf import (
    SchoolReportPdfService,
    SchoolReportReaderNotFoundError,
)

router = APIRouter(prefix="/exports")


@router.get(
    "/school-reading-report",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "Printable school reading achievement report",
        }
    },
)
def export_school_reading_report(
    reader_id: uuid.UUID,
    date_from: date,
    date_to: date,
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
) -> Response:
    if date_to < date_from:
        raise HTTPException(
            status_code=422, detail="date_to cannot be before date_from"
        )
    try:
        content = SchoolReportPdfService(session).create(
            context.household.id, reader_id, date_from, date_to
        )
    except SchoolReportReaderNotFoundError as error:
        raise HTTPException(status_code=404, detail="Reader not found") from error

    reader_name = next(
        reader.name for reader in context.household.readers if reader.id == reader_id
    )
    safe_name = re.sub(r"[^a-z0-9]+", "-", reader_name.lower()).strip("-")
    filename = f"reading-achievement-{safe_name or 'reader'}-{date_to.isoformat()}.pdf"
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/reading-data",
    response_model=ReadingDataExport,
    responses={
        200: {
            "content": {
                "application/json": {},
                "text/csv": {},
            },
            "description": (
                "Complete JSON backup, reading-session CSV, or finished-books CSV"
            ),
        }
    },
)
def export_reading_data(
    context: Annotated[HouseholdContext, Depends(get_household_context)],
    session: Annotated[Session, Depends(get_db)],
    export_format: Annotated[
        Literal["json", "csv", "finished-books-csv"], Query(alias="format")
    ] = "json",
) -> Response:
    service = ExportService(session)
    exported_on = date.today().isoformat()
    if export_format == "finished-books-csv":
        return Response(
            content=service.finished_books_csv_export(context.household),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="finished-books-{exported_on}.csv"'
                )
            },
        )
    if export_format == "csv":
        return Response(
            content=service.csv_export(context.household),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="reading-sessions-{exported_on}.csv"'
                )
            },
        )

    data = service.json_export(context.household)
    return JSONResponse(
        content=data.model_dump(mode="json"),
        headers={
            "Content-Disposition": (
                f'attachment; filename="reading-data-{exported_on}.json"'
            )
        },
    )
