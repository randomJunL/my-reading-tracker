import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { LibraryPage } from "@/routes/library-page";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  createRecommendation: vi.fn(),
  addRecommendation: vi.fn(),
  removeRecommendation: vi.fn(),
  removeFromLibrary: vi.fn(),
  search: vi.fn(),
  status: vi.fn(),
  recommendations: [] as Array<Record<string, unknown>>,
  books: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/features/readers/use-reader-selection", () => ({
  useReaderSelection: () => ({ selectedReaderId: "reader-1" }),
}));

vi.mock("@/features/books/book-api", () => ({
  useBooks: () => ({ data: mocks.books, isLoading: false }),
  useBookRecommendations: () => ({
    data: mocks.recommendations,
    isLoading: false,
  }),
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
  useCreateBookRecommendation: () => ({
    mutate: mocks.createRecommendation,
    isPending: false,
    error: null,
  }),
  useRemoveBookRecommendation: () => ({
    mutate: mocks.removeRecommendation,
  }),
  useRemoveFromLibrary: () => ({
    mutateAsync: mocks.removeFromLibrary.mockResolvedValue(undefined),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useAddRecommendedBookToLibrary: () => ({
    mutateAsync: mocks.addRecommendation.mockResolvedValue({}),
    isPending: false,
    error: null,
  }),
  bookCreateFromSearchResult: (source: Record<string, unknown>) => ({
    title: source.title,
    authors: source.authors,
    metadata_source: source.source,
    external_source_id: source.external_source_id,
  }),
  useUpdateBookStatus: () => ({ mutate: mocks.status }),
}));

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recommendations = [];
    mocks.books = [];
  });

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

  it("lets an admin recommend a search result", async () => {
    const user = userEvent.setup();
    render(<LibraryPage />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("button", { name: "Recommend" }));

    expect(
      mocks.createRecommendation.mock.calls[0]?.[0] as unknown,
    ).toMatchObject({
      book: {
        title: "The Wild Robot",
        metadata_source: "google_books",
        external_source_id: "volume-1",
      },
      note: null,
    });
  });

  it("lets a reader add a recommendation with a selected status", async () => {
    mocks.recommendations = [
      {
        id: "recommendation-1",
        book_id: "book-1",
        note: null,
        book: {
          id: "book-1",
          title: "Charlotte's Web",
          authors: ["E. B. White"],
          cover_url: null,
          reader_books: [],
        },
      },
    ];
    const user = userEvent.setup();
    render(<LibraryPage />, { wrapper: MemoryRouter });

    await user.selectOptions(
      screen.getByLabelText("Add Charlotte's Web as"),
      "reading",
    );
    await user.click(screen.getByRole("button", { name: "Add to library" }));

    expect(mocks.addRecommendation).toHaveBeenCalledWith({
      readerId: "reader-1",
      bookId: "book-1",
      status: "reading",
    });
  });

  it("removes a book card from the selected reader's library", async () => {
    mocks.books = [
      {
        id: "book-1",
        title: "The Wild Robot",
        authors: ["Peter Brown"],
        cover_url: null,
        reader_books: [{ reader_id: "reader-1", status: "reading" }],
      },
    ];
    const user = userEvent.setup();
    render(<LibraryPage />, { wrapper: MemoryRouter });

    await user.click(
      screen.getByRole("button", {
        name: "Remove The Wild Robot from library",
      }),
    );
    expect(
      screen.getByRole("dialog", { name: "Remove The Wild Robot?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove book" }));

    expect(mocks.removeFromLibrary).toHaveBeenCalledWith({
      readerId: "reader-1",
      bookId: "book-1",
    });
  });
});
