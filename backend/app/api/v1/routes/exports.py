from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.dependencies.household import get_household_context
from app.database.session import get_db
from app.schemas.exports import ReadingDataExport
from app.services.exports import ExportService
from app.services.households import HouseholdContext

router = APIRouter(prefix="/exports")


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
