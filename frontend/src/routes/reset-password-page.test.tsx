import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ResetPasswordPage } from "@/routes/reset-password-page";

const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  updatePassword: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  useAuth: authMocks.useAuth,
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    authMocks.signOut.mockResolvedValue(undefined);
    authMocks.updatePassword.mockResolvedValue(undefined);
    authMocks.useAuth.mockReturnValue({
      isConfigured: true,
      isLoading: false,
      session: { user: { id: "user-id" } },
      signOut: authMocks.signOut,
      updatePassword: authMocks.updatePassword,
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("updates the password, signs out, and returns to sign in", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/sign-in" element={<p>Sign in again</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "new-password",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(authMocks.updatePassword).toHaveBeenCalledWith("new-password");
    expect(authMocks.signOut).toHaveBeenCalled();
    expect(await screen.findByText("Sign in again")).toBeInTheDocument();
  });

  it("rejects an invalid or expired reset link", () => {
    authMocks.useAuth.mockReturnValue({
      isConfigured: true,
      isLoading: false,
      session: null,
      signOut: authMocks.signOut,
      updatePassword: authMocks.updatePassword,
    });

    render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /invalid or has expired/i,
    );
  });
});
