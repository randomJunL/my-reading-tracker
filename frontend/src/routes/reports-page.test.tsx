import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReportsPage } from "@/routes/reports-page";

vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: () => ({ data: { is_admin: true } }),
}));

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  schoolMutate: vi.fn(),
  schoolReset: vi.fn(),
}));

vi.mock("@/features/readers/use-reader-selection", () => ({
  useReaderSelection: () => ({ selectedReaderId: "reader-1" }),
}));

vi.mock("@/features/exports/export-api", () => ({
  useReadingDataExport: () => ({
    mutate: mocks.mutate,
    reset: mocks.reset,
    isPending: false,
    error: null,
    variables: undefined,
  }),
  useSchoolReportExport: () => ({
    mutate: mocks.schoolMutate,
    reset: mocks.schoolReset,
    isPending: false,
    error: null,
  }),
}));

describe("ReportsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers session and finished-book spreadsheet downloads", async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    expect(
      screen.getByRole("heading", { name: "Export reading data" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Reading achievement report" }),
    ).toBeVisible();
    expect(screen.getByText("Downloading PDF")).toBeVisible();
    expect(screen.queryByText(/poster/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Download printable PDF" }),
    );
    expect(mocks.schoolMutate).toHaveBeenCalledWith(
      expect.objectContaining({ readerId: "reader-1" }),
    );
    expect(
      screen.queryByRole("button", { name: "Download JSON backup" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Spreadsheet downloads" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Spreadsheet download options" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Download reading history CSV" }),
    );
    expect(mocks.mutate).toHaveBeenLastCalledWith("csv");
    await user.click(
      screen.getByRole("button", { name: "Download finished books CSV" }),
    );
    expect(mocks.mutate).toHaveBeenLastCalledWith("finished-books-csv");
  });
});
