import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { HistoryPage } from "@/routes/history-page";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  delete: vi.fn(),
  readSessions: vi.fn(),
}));

vi.mock("@/features/readers/use-reader-selection", () => ({
  useReaderSelection: () => ({ selectedReaderId: "reader-1" }),
}));

vi.mock("@/features/books/book-api", () => ({
  useBooks: () => ({ data: [{ id: "book-1", title: "The Wild Robot" }] }),
}));

vi.mock("@/features/sessions/session-api", () => ({
  useReadingSessions: (...args: unknown[]) => {
    mocks.readSessions(...args);
    return {
      data: [
        {
          id: "session-1",
          reader_id: "reader-1",
          book_id: "book-1",
          book_title: "The Wild Robot",
          book_cover_url: null,
          session_date: "2026-08-12",
          minutes: 15,
          start_page: 1,
          end_page: 12,
          activity_type: "with_adult",
          notes: "Great focus",
          finished_book: false,
          created_at: "2026-08-12T12:00:00Z",
          updated_at: "2026-08-12T12:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
    };
  },
  useUpdateReadingSession: () => ({
    mutateAsync: mocks.update.mockResolvedValue({}),
    isPending: false,
    error: null,
  }),
  useDeleteReadingSession: () => ({
    mutateAsync: mocks.delete.mockResolvedValue(undefined),
    isPending: false,
  }),
}));

describe("HistoryPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders history and allows corrections", async () => {
    const user = userEvent.setup();
    render(<HistoryPage />, { wrapper: MemoryRouter });

    expect(
      screen.getByText("15 minutes · With an adult", { exact: false }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /Edit The Wild Robot/ }),
    );
    const minutes = screen.getByLabelText("Minutes");
    await user.clear(minutes);
    await user.type(minutes, "20");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.update.mock.calls[0]?.[0] as unknown).toMatchObject({
      sessionId: "session-1",
      data: { minutes: 20 },
    });
  });

  it("requires confirmation before deleting an entry", async () => {
    const user = userEvent.setup();
    render(<HistoryPage />, { wrapper: MemoryRouter });

    await user.click(
      screen.getByRole("button", { name: /Delete The Wild Robot/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Delete this session?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Delete session" }));
    expect(mocks.delete).toHaveBeenCalledWith("session-1");
  });

  it("requests history using book, activity, and date filters", async () => {
    const user = userEvent.setup();
    render(<HistoryPage />, { wrapper: MemoryRouter });

    await user.selectOptions(screen.getByLabelText("Book"), "book-1");
    await user.selectOptions(screen.getByLabelText("Activity"), "with_adult");
    await user.type(screen.getByLabelText("From date"), "2026-08-01");
    await user.type(screen.getByLabelText("To date"), "2026-08-12");

    expect(mocks.readSessions).toHaveBeenLastCalledWith("reader-1", {
      bookId: "book-1",
      activityType: "with_adult",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-12",
    });
  });
});
