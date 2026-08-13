import uuid
from dataclasses import dataclass
from datetime import date
from html import escape
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Book,
    Household,
    Reader,
    ReaderBook,
    ReadingSession,
    ReadingStatus,
)

FOREST = colors.HexColor("#173F36")
MINT = colors.HexColor("#E4F0EB")
GOLD = colors.HexColor("#F4BD62")
CREAM = colors.HexColor("#F8F5EC")
CORAL = colors.HexColor("#DF6549")
INK = colors.HexColor("#274A41")
MUTED = colors.HexColor("#687B74")
LINE = colors.HexColor("#DEDCD1")


class SchoolReportReaderNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class FinishedBookRow:
    title: str
    authors: str
    first_read_at: date
    finished_at: date
    minutes: int


class SchoolReportPdfService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        household_id: uuid.UUID,
        reader_id: uuid.UUID,
        date_from: date,
        date_to: date,
    ) -> bytes:
        household = self.session.get(Household, household_id)
        reader = self.session.scalar(
            select(Reader).where(
                Reader.id == reader_id, Reader.household_id == household_id
            )
        )
        if household is None or reader is None:
            raise SchoolReportReaderNotFoundError

        sessions = list(
            self.session.scalars(
                select(ReadingSession)
                .where(
                    ReadingSession.reader_id == reader_id,
                    ReadingSession.session_date >= date_from,
                    ReadingSession.session_date <= date_to,
                )
                .order_by(ReadingSession.session_date, ReadingSession.created_at)
            )
        )
        finished = self._finished_books(reader_id, date_from, date_to)
        return _build_pdf(
            household_name=household.name,
            reader_name=reader.name,
            date_from=date_from,
            date_to=date_to,
            sessions=sessions,
            finished_books=finished,
        )

    def _finished_books(
        self,
        reader_id: uuid.UUID,
        date_from: date,
        date_to: date,
    ) -> list[FinishedBookRow]:
        assignments = self.session.execute(
            select(ReaderBook, Book)
            .join(Book, Book.id == ReaderBook.book_id)
            .where(
                ReaderBook.reader_id == reader_id,
                ReaderBook.status == ReadingStatus.FINISHED,
            )
        ).all()
        if not assignments:
            return []

        book_ids = [book.id for _, book in assignments]
        all_sessions = list(
            self.session.scalars(
                select(ReadingSession)
                .where(
                    ReadingSession.reader_id == reader_id,
                    ReadingSession.book_id.in_(book_ids),
                    ReadingSession.session_date <= date_to,
                )
                .order_by(ReadingSession.session_date, ReadingSession.created_at)
            )
        )
        sessions_by_book: dict[uuid.UUID, list[ReadingSession]] = {}
        for record in all_sessions:
            sessions_by_book.setdefault(record.book_id, []).append(record)

        rows = []
        for assignment, book in assignments:
            book_sessions = sessions_by_book.get(book.id, [])
            completion_sessions = [
                record.session_date for record in book_sessions if record.finished_book
            ]
            finished_at = (
                assignment.finished_at
                or (max(completion_sessions) if completion_sessions else None)
                or (
                    max(record.session_date for record in book_sessions)
                    if book_sessions
                    else None
                )
                or assignment.updated_at.date()
            )
            if finished_at < date_from or finished_at > date_to:
                continue

            first_read_candidates = [
                record.session_date
                for record in book_sessions
                if record.session_date <= finished_at
            ]
            if assignment.started_at:
                first_read_candidates.append(assignment.started_at)
            first_read_at = min(
                first_read_candidates, default=assignment.created_at.date()
            )
            journey_sessions = [
                record for record in book_sessions if record.session_date <= finished_at
            ]
            rows.append(
                FinishedBookRow(
                    title=book.title,
                    authors=", ".join(book.authors),
                    first_read_at=first_read_at,
                    finished_at=finished_at,
                    minutes=sum(record.minutes for record in journey_sessions),
                )
            )
        return sorted(
            rows, key=lambda item: (item.finished_at, item.title), reverse=True
        )


def _build_pdf(
    *,
    household_name: str,
    reader_name: str,
    date_from: date,
    date_to: date,
    sessions: list[ReadingSession],
    finished_books: list[FinishedBookRow],
) -> bytes:
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=letter,
        rightMargin=0.48 * inch,
        leftMargin=0.48 * inch,
        topMargin=1.72 * inch,
        bottomMargin=0.55 * inch,
        title=f"Reading achievement report - {reader_name}",
        author=household_name,
    )
    styles = _styles()
    reading_dates = sorted({record.session_date for record in sessions})
    total_minutes = sum(record.minutes for record in sessions)
    pages_read = sum(_pages_read(record) for record in sessions)
    longest_run = _longest_run(reading_dates)

    story = [
        Table(
            [
                [
                    _metric("READING MINUTES", str(total_minutes), styles),
                    _metric("READING DAYS", str(len(reading_dates)), styles),
                    _metric("BOOKS FINISHED", str(len(finished_books)), styles),
                    _metric("LONGEST DAILY RUN", f"{longest_run} days", styles),
                ]
            ],
            colWidths=[1.82 * inch] * 4,
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), MINT),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#B9D8CD")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.8, colors.white),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ]
            ),
        ),
        Spacer(1, 12),
        _section_title("READING HIGHLIGHTS", styles),
        Table(
            [
                [
                    _highlight("Sessions logged", str(len(sessions)), styles),
                    _highlight("Pages read", str(pages_read), styles),
                    _highlight(
                        "Average per reading day",
                        (
                            f"{round(total_minutes / len(reading_dates))} min"
                            if reading_dates
                            else "0 min"
                        ),
                        styles,
                    ),
                ]
            ],
            colWidths=[2.43 * inch] * 3,
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                    ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                    ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        ),
        Spacer(1, 12),
        KeepTogether(
            [
                _section_title("FINISHED BOOKS", styles),
                _books_table(finished_books, styles),
            ]
        ),
    ]

    def draw_page(canvas: Canvas, _document: object) -> None:
        _draw_header(
            canvas,
            household_name=household_name,
            reader_name=reader_name,
            date_from=date_from,
            date_to=date_to,
        )
        _draw_footer(canvas)

    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    return output.getvalue()


def _styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "metric": ParagraphStyle(
            "metric", parent=sample["Normal"], alignment=TA_CENTER, textColor=FOREST
        ),
        "highlight": ParagraphStyle(
            "highlight",
            parent=sample["Normal"],
            alignment=TA_CENTER,
            textColor=INK,
            leading=14,
        ),
        "section": ParagraphStyle(
            "section",
            parent=sample["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            tracking=1.2,
            textColor=CORAL,
            spaceAfter=5,
        ),
        "table_header": ParagraphStyle(
            "table_header",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7,
            leading=9,
            textColor=colors.white,
        ),
        "table": ParagraphStyle(
            "table",
            parent=sample["Normal"],
            fontSize=7.5,
            leading=9,
            textColor=INK,
        ),
    }


def _metric(label: str, value: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(
        f'<font name="Helvetica-Bold" size="20">{escape(value)}</font><br/>'
        f'<font name="Helvetica-Bold" size="6.5">{label}</font>',
        styles["metric"],
    )


def _highlight(label: str, value: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(
        f'<font name="Helvetica-Bold" size="13">{escape(value)}</font><br/>'
        f'<font size="7">{label}</font>',
        styles["highlight"],
    )


def _section_title(text: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(text, styles["section"])


def _books_table(
    books: list[FinishedBookRow], styles: dict[str, ParagraphStyle]
) -> Table:
    headers = ["BOOK", "AUTHOR", "FIRST READ", "FINISHED", "MINUTES"]
    data: list[list[Paragraph]] = [
        [Paragraph(item, styles["table_header"]) for item in headers]
    ]
    for book in books[:7]:
        data.append(
            [
                Paragraph(escape(book.title), styles["table"]),
                Paragraph(escape(book.authors or "-"), styles["table"]),
                Paragraph(_date_text(book.first_read_at), styles["table"]),
                Paragraph(_date_text(book.finished_at), styles["table"]),
                Paragraph(str(book.minutes), styles["table"]),
            ]
        )
    if not books:
        data.append(
            [
                Paragraph(
                    "No books finished during this report period.", styles["table"]
                ),
                Paragraph("", styles["table"]),
                Paragraph("", styles["table"]),
                Paragraph("", styles["table"]),
                Paragraph("", styles["table"]),
            ]
        )
    table = Table(
        data,
        colWidths=[2.2 * inch, 1.65 * inch, 1.15 * inch, 1.15 * inch, 0.75 * inch],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), FOREST),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _draw_header(
    canvas: Canvas,
    *,
    household_name: str,
    reader_name: str,
    date_from: date,
    date_to: date,
) -> None:
    width, height = letter
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(FOREST)
    canvas.rect(0, height - 1.48 * inch, width, 1.48 * inch, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.roundRect(
        0.48 * inch,
        height - 1.08 * inch,
        0.64 * inch,
        0.64 * inch,
        12,
        fill=1,
        stroke=0,
    )
    canvas.setFillColor(FOREST)
    canvas.setFont("Helvetica-Bold", 24)
    canvas.drawCentredString(0.8 * inch, height - 0.86 * inch, "R")
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(1.34 * inch, height - 0.48 * inch, "READING ACHIEVEMENT REPORT")
    canvas.setFont("Helvetica-Bold", 25)
    canvas.drawString(1.34 * inch, height - 0.86 * inch, reader_name[:34])
    canvas.setFillColor(colors.HexColor("#BED0CA"))
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(1.34 * inch, height - 1.09 * inch, household_name[:45])
    canvas.setFillColor(GOLD)
    canvas.setFont("Helvetica-Bold", 8.5)
    period = f"{date_from.strftime('%b %d, %Y')} - {date_to.strftime('%b %d, %Y')}"
    canvas.drawRightString(width - 0.48 * inch, height - 1.08 * inch, period)
    canvas.restoreState()


def _draw_footer(canvas: Canvas) -> None:
    width, _ = letter
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(0.48 * inch, 0.36 * inch, width - 0.48 * inch, 0.36 * inch)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 6.5)
    canvas.drawString(0.48 * inch, 0.2 * inch, "Generated by My Reading Tracker")
    canvas.drawRightString(
        width - 0.48 * inch, 0.2 * inch, f"Printed {date.today().isoformat()}"
    )
    canvas.restoreState()


def _pages_read(record: ReadingSession) -> int:
    if record.start_page is None or record.end_page is None:
        return 0
    return max(record.end_page - record.start_page, 0)


def _longest_run(values: list[date]) -> int:
    longest = 0
    current = 0
    previous: date | None = None
    for value in values:
        current = current + 1 if previous and (value - previous).days == 1 else 1
        longest = max(longest, current)
        previous = value
    return longest


def _date_text(value: date) -> str:
    return value.strftime("%b %d, %Y")
