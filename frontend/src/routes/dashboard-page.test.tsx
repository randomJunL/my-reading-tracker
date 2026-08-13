import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { DashboardPage } from "@/routes/dashboard-page";

vi.mock("@/features/readers/use-reader-selection", () => ({
  useReaderSelection: () => ({ selectedReaderId: "reader-1" }),
}));

vi.mock("@/features/reports/report-api", () => ({
  currentWeekRange: () => ({ dateFrom: "2026-08-10", dateTo: "2026-08-12" }),
  currentMonthRange: () => ({ dateFrom: "2026-08-01", dateTo: "2026-08-12" }),
  useReportSummary: (_readerId: string, range: { dateFrom: string }) => ({
    data: {
      reader_id: "reader-1",
      date_from: range.dateFrom,
      date_to: "2026-08-12",
      total_minutes: range.dateFrom === "2026-08-10" ? 75 : 210,
      pages_read: 42,
      books_finished: 1,
      reading_days: 3,
      sessions_count: 4,
      current_books: [
        {
          book_id: "book-1",
          title: "The Wild Robot",
          cover_url: null,
          page_count: 200,
          last_page: 80,
          progress_percent: 40,
          status: "reading",
        },
      ],
      recent_activity: [
        {
          id: "session-1",
          book_id: "book-1",
          book_title: "The Wild Robot",
          book_cover_url: null,
          session_date: "2026-08-12",
          minutes: 25,
          pages_read: 18,
          activity_type: "independent",
          finished_book: false,
          created_at: "2026-08-12T12:00:00Z",
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

describe("DashboardPage", () => {
  it("shows live weekly, monthly, book progress, and recent activity", () => {
    render(<DashboardPage />, { wrapper: MemoryRouter });

    expect(
      screen.getByRole("heading", { name: "A good week of reading" }),
    ).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("210")).toBeInTheDocument();
    expect(screen.getByText("The Wild Robot")).toBeInTheDocument();
    expect(screen.getByText(/The Wild Robot · 25 minutes/)).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });
});
