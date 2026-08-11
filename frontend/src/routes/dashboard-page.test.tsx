import { render, screen } from "@testing-library/react";

import { DashboardPage } from "@/routes/dashboard-page";

describe("DashboardPage", () => {
  it("shows the weekly reading overview", () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole("heading", { name: "A good week of reading" }),
    ).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.getAllByText("The Wild Robot")).not.toHaveLength(0);
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });
});
