import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { LibraryPage } from "@/routes/library-page";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  search: vi.fn(),
  status: vi.fn(),
}));

vi.mock("@/features/readers/use-reader-selection", () => ({
  useReaderSelection: () => ({ selectedReaderId: "reader-1" }),
}));

vi.mock("@/features/books/book-api", () => ({
  useBooks: () => ({ data: [], isLoading: false }),
  useSearchBooks: () => ({
    data: [
      {
        source: "google_books",
        external_source_id: "volume-1",
        title: "The Wild Robot",
        authors: ["Peter Brown"],
        cover_url: null,
        page_count: 288,
      },
    ],
    isPending: false,
    mutate: mocks.search,
    reset: vi.fn(),
  }),
  useCreateAndAssignBook: () => ({
    mutateAsync: mocks.create.mockResolvedValue({}),
    isPending: false,
    error: null,
  }),
  useUpdateBookStatus: () => ({ mutate: mocks.status }),
}));

describe("LibraryPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a parent review and correct imported metadata before saving", async () => {
    const user = userEvent.setup();
    render(<LibraryPage />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("button", { name: /The Wild Robot/i }));
    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "The Wild Robot: Classroom Copy");
    await user.click(screen.getByRole("button", { name: "Save to library" }));

    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0]?.[0] as unknown).toMatchObject({
      readerId: "reader-1",
      status: "planned",
      data: {
        title: "The Wild Robot: Classroom Copy",
        metadata_source: "google_books",
      },
    });
  });

  it("supports manual book entry", async () => {
    const user = userEvent.setup();
    render(<LibraryPage />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("button", { name: "Manual entry" }));
    await user.type(screen.getByLabelText("Title"), "Family Story Book");
    await user.type(
      screen.getByLabelText("Authors (comma separated)"),
      "A. Parent",
    );
    await user.click(screen.getByRole("button", { name: "Save to library" }));

    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0]?.[0] as unknown).toMatchObject({
      data: {
        title: "Family Story Book",
        authors: ["A. Parent"],
        metadata_source: "manual",
      },
    });
  });
});
