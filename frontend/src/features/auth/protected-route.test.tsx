import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/features/auth/protected-route";

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
});
