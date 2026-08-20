import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { RewardsPage } from "@/routes/rewards-page";

const mocks = vi.hoisted(() => ({
  redeem: vi.fn(),
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
          credit_value: 0,
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
      },
    ],
    isLoading: false,
    error: null,
  }),
  useRewardTransactions: () => ({ data: [] }),
  useRewardRedemptions: () => ({ data: [] }),
  useCreateRewardItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRewardItem: () => ({ mutate: vi.fn() }),
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
      screen.getByText("Badges celebrate progress", { exact: false }),
    ).toBeVisible();
    expect(screen.getByText("Current daily run")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "badges" }));
    expect(screen.getByText("First Book")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "First Book badge, earned" }),
    ).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "gifts" }));
    await user.click(screen.getByRole("button", { name: "Redeem" }));
    expect(mocks.redeem).toHaveBeenCalledWith({
      readerId: "reader-1",
      rewardItemId: "gift-1",
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
    await user.click(screen.getByRole("button", { name: "Delete gift" }));

    expect(mocks.deleteGift).toHaveBeenCalledOnce();
    expect(mocks.deleteGift.mock.calls[0]?.[0]).toBe("gift-1");
    const options = mocks.deleteGift.mock.calls[0]?.[1] as
      { onSuccess?: unknown } | undefined;
    expect(typeof options?.onSuccess).toBe("function");
  });
});
