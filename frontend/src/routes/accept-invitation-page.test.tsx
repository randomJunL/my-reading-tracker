import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AcceptInvitationPage } from "@/routes/accept-invitation-page";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  completeInvitation: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/api/client", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@/features/auth/auth", () => ({ useAuth: mocks.useAuth }));

describe("AcceptInvitationPage", () => {
  beforeEach(() => {
    mocks.apiFetch.mockResolvedValue({ role: "reader" });
    mocks.completeInvitation.mockResolvedValue(undefined);
    mocks.useAuth.mockReturnValue({
      completeInvitation: mocks.completeInvitation,
      isConfigured: true,
      isLoading: false,
      session: { access_token: "invite-session" },
      user: { user_metadata: { account_type: "reader" } },
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("collects profile details and completes an emailed invitation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/accept-invite"]}>
        <AcceptInvitationPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Your name"), "Maya Reader");
    await user.type(
      screen.getByLabelText("Create a password"),
      "safe-password",
    );
    await user.type(screen.getByLabelText("Confirm password"), "safe-password");
    await user.click(screen.getByRole("button", { name: "Accept invitation" }));

    expect(mocks.completeInvitation).toHaveBeenCalledWith({
      fullName: "Maya Reader",
      password: "safe-password",
    });
    expect(mocks.apiFetch).toHaveBeenCalledWith("/me");
  });

  it("shows guidance for an expired invitation link", () => {
    mocks.useAuth.mockReturnValue({
      completeInvitation: mocks.completeInvitation,
      isConfigured: true,
      isLoading: false,
      session: null,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={["/accept-invite"]}>
        <AcceptInvitationPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
  });
});
