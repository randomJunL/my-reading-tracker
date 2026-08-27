import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AccountPage } from "@/routes/account-page";

const accountMocks = vi.hoisted(() => ({
  updateCurrentUser: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  updateReader: vi.fn(),
  useAuth: vi.fn(),
  useCurrentUser: vi.fn(),
  useReaders: vi.fn(),
}));

vi.mock("@/features/auth/auth", () => ({ useAuth: accountMocks.useAuth }));
vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: accountMocks.useCurrentUser,
  useUpdateCurrentUser: () => ({ mutateAsync: accountMocks.updateCurrentUser }),
}));
vi.mock("@/features/readers/reader-api", () => ({
  useReaders: accountMocks.useReaders,
  useUpdateReader: () => ({ mutateAsync: accountMocks.updateReader }),
}));

describe("AccountPage", () => {
  beforeEach(() => {
    accountMocks.updateCurrentUser.mockResolvedValue(undefined);
    accountMocks.updatePassword.mockResolvedValue(undefined);
    accountMocks.updateProfile.mockResolvedValue(undefined);
    accountMocks.updateReader.mockResolvedValue(undefined);
    accountMocks.useAuth.mockReturnValue({
      isDevAuthBypass: false,
      updatePassword: accountMocks.updatePassword,
      updateProfile: accountMocks.updateProfile,
      user: {
        email: "owner@example.com",
        user_metadata: { full_name: "Jordan Owner" },
      },
    });
    accountMocks.useCurrentUser.mockReturnValue({
      data: {
        email: "owner@example.com",
        household_name: "The Bookworms",
        is_admin: true,
        reader_id: null,
        role: "owner",
      },
    });
    accountMocks.useReaders.mockReturnValue({ data: [] });
  });

  afterEach(() => vi.clearAllMocks());

  it("shows the signed-in identity and owner role", () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Jordan Owner");
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Family or classroom name")).toHaveValue(
      "The Bookworms",
    );
  });

  it("updates the account name and owner household name", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    );

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Jordan Smith");
    await user.clear(screen.getByLabelText("Family or classroom name"));
    await user.type(
      screen.getByLabelText("Family or classroom name"),
      "Smith Family Readers",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(accountMocks.updateProfile).toHaveBeenCalledWith({
      fullName: "Jordan Smith",
    });
    expect(accountMocks.updateCurrentUser).toHaveBeenCalledWith({
      household_name: "Smith Family Readers",
    });
    expect(
      await screen.findByText("Your account information has been updated."),
    ).toBeInTheDocument();
  });

  it("changes a signed-in password without sending email", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "new-password",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(accountMocks.updatePassword).toHaveBeenCalledWith("new-password");
    expect(
      await screen.findByText("Your password has been updated."),
    ).toBeInTheDocument();
  });
});
