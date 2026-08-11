import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { SignInPage } from "@/routes/sign-in-page";

const authMocks = vi.hoisted(() => ({
  sendMagicLink: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  useAuth: authMocks.useAuth,
}));

describe("SignInPage", () => {
  beforeEach(() => {
    authMocks.sendMagicLink.mockResolvedValue(undefined);
    authMocks.useAuth.mockReturnValue({
      isConfigured: true,
      isDevAuthBypass: false,
      isLoading: false,
      session: null,
      sendMagicLink: authMocks.sendMagicLink,
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("requests a magic link for the parent email", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "parent@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "Email me a sign-in link" }),
    );

    expect(authMocks.sendMagicLink).toHaveBeenCalledWith("parent@example.com");
    expect(
      await screen.findByText("Check your email for a secure sign-in link."),
    ).toBeInTheDocument();
  });
});
