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

  it("explains the adult and reader account paths", () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "How will you use My Reading Tracker?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue as Parent or teacher" }),
    ).toHaveTextContent("Manage a family or classroom");
    expect(
      screen.getByRole("button", { name: "Continue as Reader" }),
    ).toHaveTextContent("Open your reading account");
  });

  it("requests a magic link for the parent email", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Continue as Parent or teacher" }),
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

  it("tells readers that an administrator invitation is required", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Continue as Reader" }),
    );

    expect(
      screen.getByText(/Reader access requires an invitation/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose another role" }),
    ).toBeInTheDocument();
  });
});
