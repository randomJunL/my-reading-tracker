import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { LogReadingPage } from "@/routes/log-reading-page";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/features/readers/use-reader-selection", () => ({
  useReaderSelection: () => ({ selectedReaderId: "reader-1" }),
}));

vi.mock("@/features/books/book-api", () => ({
  useBooks: () => ({
    data: [
      {
        id: "book-2",
        title: "Charlotte's Web",
        authors: ["E. B. White"],
        metadata_source: "manual",
      },
      {
        id: "book-1",
        title: "The Wild Robot",
        authors: ["Peter Brown"],
        metadata_source: "manual",
      },
    ],
  }),
}));

vi.mock("@/features/sessions/session-api", () => ({
  useReadingSessions: () => ({ data: [{ book_id: "book-1" }] }),
  useCreateReadingSession: () => ({
    mutateAsync: mocks.create.mockResolvedValue({}),
    isPending: false,
    error: null,
  }),
}));

describe("LogReadingPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs a normal session with only the fast-path fields", async () => {
    const user = userEvent.setup();
    render(<LogReadingPage />, { wrapper: MemoryRouter });

    expect(screen.getByLabelText("Book")).toHaveValue("book-1");
    expect(screen.getByLabelText("Reading type")).toHaveValue("independent");
    await user.type(screen.getByLabelText("Minutes"), "15");
    await user.click(screen.getByRole("button", { name: "Log reading" }));

    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0]?.[0] as unknown).toMatchObject({
      reader_id: "reader-1",
      book_id: "book-1",
      minutes: 15,
      activity_type: "independent",
      finished_book: false,
    });
  });

  it("offers all four reading activity types", () => {
    render(<LogReadingPage />, { wrapper: MemoryRouter });

    expect(screen.getByRole("option", { name: "Independent" })).toBeVisible();
    expect(screen.getByRole("option", { name: "With an adult" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Read aloud" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Audiobook" })).toBeVisible();
  });
});
