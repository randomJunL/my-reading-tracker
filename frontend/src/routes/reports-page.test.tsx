import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReportsPage } from "@/routes/reports-page";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), reset: vi.fn() }));

vi.mock("@/features/exports/export-api", () => ({
  useReadingDataExport: () => ({
    mutate: mocks.mutate,
    reset: mocks.reset,
    isPending: false,
    error: null,
    variables: undefined,
  }),
}));

describe("ReportsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers backup, session, and finished-book downloads", async () => {
    const user = userEvent.setup();
    render(<ReportsPage />);

    expect(
      screen.getByRole("heading", { name: "Export reading data" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Download JSON backup" }),
    );
    expect(mocks.mutate).toHaveBeenLastCalledWith("json");
    await user.click(
      screen.getByRole("button", { name: "Download session CSV" }),
    );
    expect(mocks.mutate).toHaveBeenLastCalledWith("csv");
    await user.click(
      screen.getByRole("button", { name: "Download finished books" }),
    );
    expect(mocks.mutate).toHaveBeenLastCalledWith("finished-books-csv");
  });
});
