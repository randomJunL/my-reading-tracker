import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { SignInPage } from "@/routes/sign-in-page";

const authMocks = vi.hoisted(() => ({
  registerAdult: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInWithPassword: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  useAuth: authMocks.useAuth,
}));

describe("SignInPage", () => {
  beforeEach(() => {
    authMocks.registerAdult.mockResolvedValue(undefined);
    authMocks.requestPasswordReset.mockResolvedValue(undefined);
    authMocks.signInWithPassword.mockResolvedValue(undefined);
    authMocks.useAuth.mockReturnValue({
      isConfigured: true,
      isDevAuthBypass: false,
      isLoading: false,
      session: null,
      registerAdult: authMocks.registerAdult,
      requestPasswordReset: authMocks.requestPasswordReset,
      signInWithPassword: authMocks.signInWithPassword,
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
    await user.type(screen.getByLabelText("Password"), "safe-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith(
      "parent@example.com",
      "safe-password",
    );
  });

  it("registers a parent with basic household information", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Continue as Parent or teacher" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Show create account form" }),
    );
    await user.type(screen.getByLabelText("Your name"), "Jordan Parent");
    await user.type(
      screen.getByLabelText("Family or classroom name"),
      "The Bookworms",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "parent@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "safe-password");
    await user.type(screen.getByLabelText("Confirm password"), "safe-password");
    await user.click(
      screen.getByRole("button", {
        name: "Create parent or teacher account",
      }),
    );

    expect(authMocks.registerAdult).toHaveBeenCalledWith({
      email: "parent@example.com",
      fullName: "Jordan Parent",
      householdName: "The Bookworms",
      password: "safe-password",
    });
    expect(
      await screen.findByText(/Your account is ready/i),
    ).toBeInTheDocument();
  });
});
