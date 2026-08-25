import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/features/auth/protected-route";
import { ApiError } from "@/api/client";

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useCurrentUser: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({
  useAuth: authMocks.useAuth,
}));

vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: authMocks.useCurrentUser,
}));

describe("ProtectedRoute", () => {
  it("redirects an unauthenticated visitor to sign in", () => {
    authMocks.useAuth.mockReturnValue({
      isLoading: false,
      isDevAuthBypass: false,
      session: null,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route index element={<p>Private dashboard</p>} />
          </Route>
          <Route path="/sign-in" element={<p>Sign in page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in page")).toBeInTheDocument();
    expect(screen.queryByText("Private dashboard")).not.toBeInTheDocument();
  });

  it("allows the local developer through without a Supabase session", () => {
    authMocks.useAuth.mockReturnValue({
      isLoading: false,
      isDevAuthBypass: true,
      session: null,
      signOut: vi.fn(),
    });
    authMocks.useCurrentUser.mockReturnValue({
      data: {
        email: "developer@localhost",
        household_name: "My Household",
      },
      isPending: false,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route index element={<p>Private dashboard</p>} />
          </Route>
          <Route path="/sign-in" element={<p>Sign in page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Private dashboard")).toBeInTheDocument();
  });

  it("explains missing or revoked reader access", () => {
    authMocks.useAuth.mockReturnValue({
      isLoading: false,
      isDevAuthBypass: false,
      session: { user: { id: "reader" } },
      signOut: vi.fn(),
    });
    authMocks.useCurrentUser.mockReturnValue({
      error: new ApiError("A valid invitation is required", 403),
      isPending: false,
      isError: true,
    });

    render(
      <MemoryRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route index element={<p>Private dashboard</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Reader access unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/active reader invitation/i)).toBeInTheDocument();
  });

  it("clears an expired session", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    authMocks.useAuth.mockReturnValue({
      isLoading: false,
      isDevAuthBypass: false,
      session: { user: { id: "expired" } },
      signOut,
    });
    authMocks.useCurrentUser.mockReturnValue({
      error: new ApiError("Invalid or expired authentication token", 401),
      isPending: false,
      isError: true,
    });

    render(
      <MemoryRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route index element={<p>Private dashboard</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Your session expired" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
