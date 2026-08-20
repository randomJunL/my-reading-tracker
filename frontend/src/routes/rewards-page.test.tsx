import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { RewardsPage } from "@/routes/rewards-page";

const mocks = vi.hoisted(() => ({
  createGift: vi.fn(),
  redeem: vi.fn(),
  updateGift: vi.fn(),
  transition: vi.fn(),
  deleteGift: vi.fn(),
}));

vi.mock("@/features/readers/use-reader-selection", () => ({
  useReaderSelection: () => ({ selectedReaderId: "reader-1" }),
}));

vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: () => ({ data: { is_admin: true } }),
}));

vi.mock("@/features/rewards/reward-api", () => ({
  useRewardProgress: () => ({
    data: {
      reader_id: "reader-1",
      credit_balance: 2,
      finished_books: 1,
      current_week_reading_days: 3,
      current_weekly_streak: 1,
      longest_weekly_streak: 1,
      current_continuous_days: 3,
      longest_continuous_days: 3,
      badges: [
        {
          badge_id: "badge-1",
          code: "first-book",
          name: "First Book",
          description: "Finished the first book.",
          category: "books_finished",
          threshold: 1,
          current_value: 1,
          earned: true,
          earned_at: "2026-08-13T12:00:00Z",
          progress_percent: 100,
          credit_value: 3,
        },
        {
          badge_id: "badge-2",
          code: "one-week-reader",
          name: "One-Week Reader",
          description: "Read for seven continuous days.",
          category: "continuous_days",
          threshold: 7,
          current_value: 3,
          earned: false,
          earned_at: null,
          progress_percent: 42.9,
          credit_value: 7,
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useRewardItems: () => ({
    data: [
      {
        id: "gift-1",
        name: "Choose dessert",
        description: "Pick tonight's dessert.",
        credit_cost: 1,
        quantity: null,
        active: true,
        deleted_at: null,
      },
      {
        id: "gift-archived",
        name: "Old prize",
        description: "No longer offered.",
        credit_cost: 4,
        quantity: 0,
        active: false,
        deleted_at: "2026-08-14T12:00:00Z",
      },
    ],
    isLoading: false,
    error: null,
  }),
  useRewardTransactions: () => ({ data: [] }),
  useRewardRedemptions: () => ({ data: [] }),
  useCreateRewardItem: () => ({
    mutateAsync: mocks.createGift,
    isPending: false,
  }),
  useUpdateRewardItem: () => ({
    mutate: mocks.updateGift,
    mutateAsync: mocks.updateGift,
    isPending: false,
  }),
  useDeleteRewardItem: () => ({
    mutate: mocks.deleteGift,
    reset: vi.fn(),
    isPending: false,
    error: null,
  }),
  useRedeemReward: () => ({
    mutate: mocks.redeem,
    isPending: false,
    error: null,
  }),
  useTransitionRedemption: () => ({ mutate: mocks.transition }),
}));

describe("RewardsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows progress, earned badges, and redeemable gifts", async () => {
    const user = userEvent.setup();
    render(<RewardsPage />, { wrapper: MemoryRouter });

    expect(
      screen.getByText("Available credits").parentElement,
    ).toHaveTextContent("Available credits2");
    expect(
      screen.getByRole("heading", { name: "How the reward system works" }),
    ).toBeVisible();
    expect(
      screen.getByText("Each session earns 1 credit.", { exact: false }),
    ).toBeVisible();
    expect(
      screen.getByText("Each new badge adds", { exact: false }),
    ).toBeVisible();
    expect(screen.getByText("Current daily run")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "badges" }));
    expect(screen.getByText("First Book")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "First Book badge, earned" }),
    ).toBeVisible();
    expect(screen.getByText("Worth 3 credits")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "gifts" }));
    await user.click(screen.getByRole("button", { name: "Redeem" }));
    expect(mocks.redeem).toHaveBeenCalledWith({
      readerId: "reader-1",
      rewardItemId: "gift-1",
    });
  });

  it("lets an admin create a credit-only gift", async () => {
    const user = userEvent.setup();
    render(<RewardsPage />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("tab", { name: "gifts" }));
    await user.click(screen.getByRole("button", { name: "Add a gift" }));
    await user.type(screen.getByLabelText("Gift name"), "Movie night");
    await user.clear(screen.getByLabelText("Credit cost"));
    await user.type(screen.getByLabelText("Credit cost"), "7");
    expect(
      screen.queryByLabelText("Required badge (optional)"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save gift" }));

    expect(mocks.createGift).toHaveBeenCalledWith({
      name: "Movie night",
      description: null,
      credit_cost: 7,
      quantity: null,
      active: true,
      image_url: null,
    });
  });

  it("confirms before deleting an added gift", async () => {
    const user = userEvent.setup();
    render(<RewardsPage />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("tab", { name: "gifts" }));
    await user.click(
      screen.getByRole("button", { name: "Delete Choose dessert" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Delete Choose dessert?" }),
    ).toBeVisible();
    expect(screen.getByText("database record", { exact: false })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Delete gift" }));

    expect(mocks.deleteGift).toHaveBeenCalledOnce();
    expect(mocks.deleteGift.mock.calls[0]?.[0]).toBe("gift-1");
    const options = mocks.deleteGift.mock.calls[0]?.[1] as
      { onSuccess?: unknown } | undefined;
    expect(typeof options?.onSuccess).toBe("function");
  });

  it("lets an admin edit all gift settings", async () => {
    const user = userEvent.setup();
    render(<RewardsPage />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("tab", { name: "gifts" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(
      screen.getByText("Existing redemption history", { exact: false }),
    ).toBeVisible();
    await user.clear(screen.getByLabelText("Gift name"));
    await user.type(screen.getByLabelText("Gift name"), "Choose a movie");
    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "Family movie night");
    await user.clear(screen.getByLabelText("Credit cost"));
    await user.type(screen.getByLabelText("Credit cost"), "5");
    await user.type(
      screen.getByLabelText("Quantity (blank means unlimited)"),
      "4",
    );
    await user.selectOptions(screen.getByLabelText("Availability"), "retired");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mocks.updateGift).toHaveBeenCalledWith({
      itemId: "gift-1",
      data: {
        name: "Choose a movie",
        description: "Family movie night",
        credit_cost: 5,
        quantity: 4,
        active: false,
      },
    });
  });

  it("does not display soft-deleted gifts or an archive section", async () => {
    const user = userEvent.setup();
    render(<RewardsPage />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole("tab", { name: "gifts" }));
    expect(screen.queryByText("Old prize")).not.toBeInTheDocument();
    expect(screen.queryByText(/Archived gifts/)).not.toBeInTheDocument();
  });
});
