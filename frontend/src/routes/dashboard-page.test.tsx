import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { DashboardPage } from "@/routes/dashboard-page";

vi.mock("@/features/readers/use-reader-selection", () => ({
  useReaderSelection: () => ({ selectedReaderId: "reader-1" }),
}));

vi.mock("@/features/rewards/reward-api", () => ({
  useRewardProgress: () => ({
    data: {
      credit_balance: 3,
      current_continuous_days: 7,
      current_week_reading_days: 3,
      finished_books: 6,
    },
  }),
}));

vi.mock("@/features/reports/report-api", () => ({
  currentCalendarMonthRange: (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, value.getMonth() + 1, 0).getDate();
    return {
      dateFrom: `${year}-${month}-01`,
      dateTo: `${year}-${month}-${lastDay}`,
    };
  },
  currentWeekRange: () => ({ dateFrom: "2026-08-10", dateTo: "2026-08-12" }),
  currentMonthRange: () => ({ dateFrom: "2026-08-01", dateTo: "2026-08-12" }),
  useCalendarReport: (
    _readerId: string,
    range: { dateFrom: string; dateTo: string },
  ) => ({
    data: {
      reader_id: "reader-1",
      date_from: range.dateFrom,
      date_to: range.dateTo,
      days:
        range.dateFrom === "2026-08-01"
          ? [
              {
                date: "2026-08-12",
                minutes: 25,
                pages_read: 18,
                sessions_count: 1,
                books_finished: 0,
              },
            ]
          : [],
    },
    isLoading: false,
    error: null,
  }),
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
  it("shows monthly activity, book progress, and recent activity", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />, { wrapper: MemoryRouter });

    expect(
      screen.getByRole("heading", { name: "A good week of reading" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Reading days this month")).toBeInTheDocument();
    expect(screen.getByText("Books finished so far")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Reading summary" })).getByText(
        "6",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Minutes this week")).not.toBeInTheDocument();
    expect(screen.queryByText("Pages this week")).not.toBeInTheDocument();
    expect(screen.queryByText("Minutes this month")).not.toBeInTheDocument();
    expect(screen.getByText("Reading calendar")).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", {
        name: "Aug 12, 2026: 25 reading minutes across 1 session",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("The Wild Robot")).toBeInTheDocument();
    expect(screen.getByText(/The Wild Robot · 25 minutes/)).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("Recent activity")).toBeInTheDocument();

    expect(
      screen.getByRole("combobox", { name: "Calendar month" }),
    ).toHaveValue("7");
    expect(screen.getByRole("combobox", { name: "Calendar year" })).toHaveValue(
      "2026",
    );
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(
      screen.getByText("Daily reading minutes for July 2026"),
    ).toBeVisible();
  });
});
