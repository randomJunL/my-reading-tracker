import {
  Award,
  BookCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  Flame,
  Gift,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/features/auth/current-user";
import { useReaderSelection } from "@/features/readers/use-reader-selection";
import { BadgeEmblem } from "@/features/rewards/badge-emblem";
import {
  type Redemption,
  type RewardItem,
  type RewardProgress,
  type RewardTransaction,
  useCreateRewardItem,
  useDeleteRewardItem,
  useRedeemReward,
  useRewardItems,
  useRewardProgress,
  useRewardRedemptions,
  useRewardTransactions,
  useTransitionRedemption,
  useUpdateRewardItem,
} from "@/features/rewards/reward-api";

type Section = "progress" | "badges" | "gifts" | "history";

const categoryLabels: Record<string, string> = {
  books_finished: "Books finished",
  weekly_consistency: "Weekly consistency",
  weekly_streak: "Weekly streak",
  continuous_days: "Continuous reading days",
};

export function RewardsPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.is_admin ?? false;
  const location = useLocation();
  const { selectedReaderId } = useReaderSelection();
  const [section, setSection] = useState<Section>("progress");
  const progress = useRewardProgress(selectedReaderId);
  const items = useRewardItems();
  const transactions = useRewardTransactions(selectedReaderId);
  const redemptions = useRewardRedemptions(selectedReaderId);

  if (!selectedReaderId) {
    return (
      <Card className="p-10 text-center">
        <Gift className="mx-auto size-10 text-[#4d7167]" />
        <h1 className="mt-4 font-serif text-3xl font-bold">
          Choose a reader first
        </h1>
        <Link
          to="/readers"
          className="mt-5 inline-block text-sm font-bold text-[#c4543d]"
        >
          Manage readers
        </Link>
      </Card>
    );
  }
  if (progress.isLoading || items.isLoading) {
    return (
      <Card className="p-10 text-center text-[#687b74]">Loading rewards…</Card>
    );
  }
  if (progress.error || items.error || !progress.data) {
    return (
      <Card className="p-10 text-center text-[#943f30]" role="alert">
        Rewards could not be loaded.
      </Card>
    );
  }

  const earned = progress.data.badges.filter((badge) => badge.earned);
  const newBadges =
    (location.state as { newBadges?: string[] } | null)?.newBadges ?? [];
  return (
    <section className="animate-[fade-in_350ms_ease-out]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#c65c43] uppercase">
            Achievements and gifts
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold">Rewards</h1>
          <p className="mt-2 text-sm text-[#687b74]">
            Celebrate lasting habits and redeem earned credits.
          </p>
          <p className="mt-1 text-xs font-semibold text-[#527068]">
            1 credit per logged session · maximum 2 credits per day
          </p>
        </div>
        <div className="rounded-2xl bg-[#173f36] px-5 py-3 text-white">
          <span className="text-xs text-[#bfd1cb]">Available credits</span>
          <p className="font-serif text-3xl font-bold text-[#f4bd62]">
            {progress.data.credit_balance}
          </p>
        </div>
      </div>

      {newBadges.length ? (
        <Card className="mb-5 border-[#e0a34d] bg-[#fff6dc] p-6 text-center">
          <Sparkles className="mx-auto size-7 text-[#bd7423]" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-[#6e4419]">
            New badge earned!
          </h2>
          <p className="mt-1 text-sm text-[#805a2e]">
            {newBadges.join(", ")} · Keep building your reading habit!
          </p>
        </Card>
      ) : null}

      <RewardGuide />

      <div
        className="mb-5 flex gap-2 overflow-x-auto"
        role="tablist"
        aria-label="Reward sections"
      >
        {(["progress", "badges", "gifts", "history"] as Section[]).map(
          (value) => (
            <button
              key={value}
              role="tab"
              aria-selected={section === value}
              onClick={() => setSection(value)}
              className={`rounded-xl px-4 py-2 text-sm font-bold capitalize ${section === value ? "bg-[#173f36] text-white" : "bg-white text-[#42645b]"}`}
            >
              {value}
            </button>
          ),
        )}
      </div>

      {section === "progress" ? (
        <ProgressSection progress={progress.data} />
      ) : null}
      {section === "badges" ? (
        <BadgesSection badges={progress.data.badges} />
      ) : null}
      {section === "gifts" ? (
        <GiftsSection
          readerId={selectedReaderId}
          balance={progress.data.credit_balance}
          items={(items.data ?? []).filter((item) => !item.deleted_at)}
          isAdmin={isAdmin}
        />
      ) : null}
      {section === "history" ? (
        <HistorySection
          transactions={transactions.data ?? []}
          redemptions={redemptions.data ?? []}
          isAdmin={isAdmin}
        />
      ) : null}

      {earned.length === 0 ? null : (
        <p className="mt-5 text-center text-xs text-[#768983]">
          {earned.length} of {progress.data.badges.length} permanent badges
          earned
        </p>
      )}
    </section>
  );
}

function RewardGuide() {
  const steps = [
    {
      icon: BookCheck,
      title: "Log reading",
      description: "Save a reading session from the Log reading page.",
    },
    {
      icon: CircleDollarSign,
      title: "Earn credits",
      description:
        "Each session earns 1 credit. A reader can earn up to 2 credits on the same date.",
    },
    {
      icon: Award,
      title: "Collect badges",
      description:
        "Finish books and build consistent reading streaks. Each new badge adds its displayed value to your credits.",
    },
    {
      icon: Gift,
      title: "Choose a gift",
      description:
        "Use saved credits in the Gift shop. Rejected or cancelled requests return the credits.",
    },
  ] as const;

  return (
    <Card className="mb-5 overflow-hidden border-[#d5ded8] bg-[#f8fbf8]">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:content-none sm:px-6">
          <div>
            <p className="text-xs font-bold tracking-[0.13em] text-[#c65c43] uppercase">
              Quick guide
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[#21483e]">
              How the reward system works
            </h2>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#527068]">
            Show or hide
            <ChevronDown className="size-5 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="border-t border-[#dce4df] px-5 py-5 sm:px-6">
          <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li key={title} className="rounded-2xl bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#e5eee9] font-serif font-bold text-[#315f53]">
                    {index + 1}
                  </span>
                  <Icon className="size-5 text-[#c65c43]" />
                </div>
                <h3 className="mt-3 font-serif text-lg font-bold text-[#294f45]">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#687b74]">
                  {description}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl bg-[#fff6dc] px-4 py-3 text-sm text-[#765326]">
            <strong>Good to know:</strong> A third session on the same day still
            counts toward reading history, streaks, and badges—it simply does
            not earn another credit. Unused credits stay available until they
            are redeemed.
          </p>
        </div>
      </details>
    </Card>
  );
}

function ProgressSection({ progress }: { progress: RewardProgress }) {
  const stats = [
    ["Current daily run", progress.current_continuous_days, Flame],
    ["Longest daily run", progress.longest_continuous_days, Trophy],
    ["Days this week", progress.current_week_reading_days, Sparkles],
    ["Weekly streak", progress.current_weekly_streak, Award],
    ["Finished books", progress.finished_books, BookCheck],
  ] as const;
  const upcoming = progress.badges.filter((badge) => !badge.earned).slice(0, 4);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value, Icon]) => (
          <Card key={label} className="p-5">
            <Icon className="size-5 text-[#c65c43]" />
            <p className="mt-4 text-xs font-bold text-[#71827c]">{label}</p>
            <p className="mt-1 font-serif text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-5 p-6">
        <h2 className="font-serif text-2xl font-bold">Coming up next</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {upcoming.map((badge) => (
            <BadgeProgressCard key={badge.badge_id} badge={badge} />
          ))}
          {upcoming.length === 0 ? (
            <p className="text-sm text-[#687b74]">
              Every permanent badge is complete. Logged reading sessions still
              earn up to two credits each day.
            </p>
          ) : null}
        </div>
      </Card>
    </>
  );
}

function BadgesSection({ badges }: { badges: RewardProgress["badges"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {badges.map((badge) => (
        <Card
          key={badge.badge_id}
          className={`relative overflow-hidden p-5 ${badge.earned ? "border-[#e0a34d] bg-[#fffaf0]" : "bg-[#f4f5f1]"}`}
        >
          <div className="text-center">
            <div className="flex justify-center">
              <BadgeEmblem
                code={badge.code}
                category={badge.category}
                name={badge.name}
                threshold={badge.threshold}
                earned={badge.earned}
              />
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold tracking-wide text-[#8a7160] uppercase">
                {categoryLabels[badge.category]}
              </p>
              <h2 className="mt-1 font-serif text-xl font-bold">
                {badge.name}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#687b74]">
                {badge.description}
              </p>
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#f8e6b9] px-3 py-1 text-xs font-bold text-[#815416]">
                <CircleDollarSign className="size-3.5" />
                Worth {badge.credit_value}{" "}
                {badge.credit_value === 1 ? "credit" : "credits"}
              </p>
              {badge.earned_at ? (
                <p className="mt-3 text-[10px] font-bold text-[#9a621e] uppercase">
                  Earned {formatDate(badge.earned_at)}
                </p>
              ) : (
                <p className="mt-3 text-xs font-bold text-[#60756e]">
                  {badge.current_value} / {badge.threshold}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function BadgeProgressCard({
  badge,
}: {
  badge: RewardProgress["badges"][number];
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#f5f6f1] p-4">
      <BadgeEmblem
        compact
        code={badge.code}
        category={badge.category}
        name={badge.name}
        threshold={badge.threshold}
        earned={badge.earned}
      />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#8a7160]">
              {categoryLabels[badge.category]}
            </p>
            <p className="mt-1 font-bold text-[#294f45]">{badge.name}</p>
            <p className="mt-1 text-xs font-bold text-[#a16023]">
              +{badge.credit_value} credits when earned
            </p>
          </div>
          <span className="text-xs font-bold">
            {badge.current_value}/{badge.threshold}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dce4df]">
          <div
            className="h-full rounded-full bg-[#df6549]"
            style={{ width: `${badge.progress_percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function GiftsSection({
  readerId,
  balance,
  items,
  isAdmin,
}: {
  readerId: string;
  balance: number;
  items: RewardItem[];
  isAdmin: boolean;
}) {
  const create = useCreateRewardItem();
  const deletion = useDeleteRewardItem();
  const update = useUpdateRewardItem();
  const redeem = useRedeemReward();
  const [showForm, setShowForm] = useState(false);
  const [giftToDelete, setGiftToDelete] = useState<RewardItem | null>(null);
  const [giftToEdit, setGiftToEdit] = useState<RewardItem | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = form.get("name");
    const description = form.get("description");
    await create.mutateAsync({
      name: typeof name === "string" ? name : "",
      description:
        typeof description === "string" && description ? description : null,
      credit_cost: Number(form.get("cost")),
      quantity: form.get("quantity") ? Number(form.get("quantity")) : null,
      active: true,
      image_url: null,
    });
    formElement.reset();
    setShowForm(false);
  }
  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!giftToEdit) return;
    const form = new FormData(event.currentTarget);
    const name = form.get("edit_name");
    const description = form.get("edit_description");
    await update.mutateAsync({
      itemId: giftToEdit.id,
      data: {
        name: typeof name === "string" ? name : "",
        description:
          typeof description === "string" && description ? description : null,
        credit_cost: Number(form.get("edit_cost")),
        quantity: form.get("edit_quantity")
          ? Number(form.get("edit_quantity"))
          : null,
        active: form.get("edit_availability") === "active",
      },
    });
    setGiftToEdit(null);
  }
  return (
    <>
      {isAdmin ? (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onClick={() => setShowForm(!showForm)}>
            <Plus className="size-4" />
            Add a gift
          </Button>
        </div>
      ) : null}
      {showForm ? (
        <Card className="mb-5 p-5">
          <form
            onSubmit={(event) => void submit(event)}
            className="grid gap-4 md:grid-cols-4"
          >
            <label className="text-xs font-bold">
              Gift name
              <input
                name="name"
                required
                className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-bold">
              Description
              <input
                name="description"
                className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-bold">
              Credit cost
              <input
                name="cost"
                type="number"
                min="1"
                defaultValue="1"
                required
                className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-bold">
              Quantity (optional)
              <input
                name="quantity"
                type="number"
                min="0"
                className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-normal"
              />
            </label>
            <div className="md:col-span-4">
              <Button disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save gift"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className={`relative p-5 ${item.active ? "" : "opacity-60"}`}
          >
            {isAdmin ? (
              <button
                type="button"
                aria-label={`Delete ${item.name}`}
                title="Delete gift"
                onClick={() => {
                  deletion.reset();
                  setGiftToDelete(item);
                }}
                className="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-[#87958f] hover:bg-[#f7e9e5] hover:text-[#a34435]"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
            <Gift className="size-6 text-[#c65c43]" />
            <h2 className="mt-4 font-serif text-xl font-bold">{item.name}</h2>
            <p className="mt-1 min-h-10 text-xs leading-5 text-[#687b74]">
              {item.description || "A household reward."}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-bold text-[#294f45]">
                {item.credit_cost}{" "}
                {item.credit_cost === 1 ? "credit" : "credits"}
              </span>
              <span className="text-xs text-[#71827c]">
                {item.quantity === null ? "Unlimited" : `${item.quantity} left`}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                disabled={
                  !item.active ||
                  item.quantity === 0 ||
                  balance < item.credit_cost ||
                  redeem.isPending
                }
                onClick={() =>
                  redeem.mutate({ readerId, rewardItemId: item.id })
                }
              >
                Redeem
              </Button>
              {isAdmin ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setGiftToEdit(item)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      update.mutate({
                        itemId: item.id,
                        data: { active: !item.active },
                      })
                    }
                  >
                    {item.active ? "Retire" : "Activate"}
                  </Button>
                </>
              ) : null}
            </div>
          </Card>
        ))}
        {items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-[#687b74]">
            Add the first gift to open the reward shop.
          </Card>
        ) : null}
      </div>
      {redeem.error ? (
        <p role="alert" className="mt-4 text-sm text-[#943f30]">
          {redeem.error.message}
        </p>
      ) : null}
      {giftToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/55 p-4">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-gift-heading"
            className="max-w-md p-7"
          >
            <Trash2 className="size-8 text-[#a34435]" />
            <h2
              id="delete-gift-heading"
              className="mt-4 font-serif text-2xl font-bold"
            >
              Delete {giftToDelete.name}?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#687b74]">
              This hides the gift from the reward shop. Its database record and
              all redemption history will be kept for school records. It will
              not appear in the app after deletion.
            </p>
            {deletion.error ? (
              <p role="alert" className="mt-3 text-sm text-[#943f30]">
                {deletion.error.message}
              </p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <Button
                disabled={deletion.isPending}
                onClick={() =>
                  deletion.mutate(giftToDelete.id, {
                    onSuccess: () => setGiftToDelete(null),
                  })
                }
              >
                {deletion.isPending ? "Deleting…" : "Delete gift"}
              </Button>
              <Button variant="secondary" onClick={() => setGiftToDelete(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      {giftToEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/55 p-4">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-gift-heading"
            className="w-full max-w-2xl p-7"
          >
            <Pencil className="size-7 text-[#c65c43]" />
            <h2
              id="edit-gift-heading"
              className="mt-3 font-serif text-2xl font-bold"
            >
              Edit {giftToEdit.name}
            </h2>
            <p className="mt-2 text-sm text-[#687b74]">
              Changes apply to future redemptions. Existing redemption history
              keeps its original gift name and credit price.
            </p>
            <form
              onSubmit={(event) => void submitEdit(event)}
              className="mt-6 grid gap-4 sm:grid-cols-2"
            >
              <label className="text-xs font-bold">
                Gift name
                <input
                  name="edit_name"
                  defaultValue={giftToEdit.name}
                  required
                  className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold">
                Description
                <input
                  name="edit_description"
                  defaultValue={giftToEdit.description ?? ""}
                  className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold">
                Credit cost
                <input
                  name="edit_cost"
                  type="number"
                  min="1"
                  defaultValue={giftToEdit.credit_cost}
                  required
                  className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold">
                Quantity (blank means unlimited)
                <input
                  name="edit_quantity"
                  type="number"
                  min="0"
                  defaultValue={giftToEdit.quantity ?? ""}
                  className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold sm:col-span-2">
                Availability
                <select
                  name="edit_availability"
                  defaultValue={giftToEdit.active ? "active" : "retired"}
                  className="mt-1 h-10 w-full rounded-xl border bg-white px-3 text-sm font-normal"
                >
                  <option value="active">Active in Gift Shop</option>
                  <option value="retired">Retired</option>
                </select>
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <Button disabled={update.isPending}>
                  {update.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setGiftToEdit(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function HistorySection({
  transactions,
  redemptions,
  isAdmin,
}: {
  transactions: RewardTransaction[];
  redemptions: Redemption[];
  isAdmin: boolean;
}) {
  const transition = useTransitionRedemption();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="border-b p-5">
          <h2 className="font-serif text-2xl font-bold">Credit history</h2>
        </div>
        <div className="divide-y">
          {transactions.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-bold">{item.description}</p>
                <p className="mt-1 text-xs text-[#71827c]">
                  {formatDate(item.created_at)}
                </p>
              </div>
              <span
                className={`font-bold ${item.amount > 0 ? "text-[#28705f]" : "text-[#a34435]"}`}
              >
                {item.amount > 0 ? "+" : ""}
                {item.amount}
              </span>
            </div>
          ))}
          {transactions.length === 0 ? (
            <p className="p-6 text-sm text-[#687b74]">No credits earned yet.</p>
          ) : null}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b p-5">
          <h2 className="font-serif text-2xl font-bold">Gift requests</h2>
        </div>
        <div className="divide-y">
          {redemptions.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex justify-between">
                <p className="text-sm font-bold">{item.reward_name}</p>
                <span className="text-xs font-bold text-[#8a7160] uppercase">
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#71827c]">
                {item.credit_cost} credits · {formatDate(item.requested_at)}
              </p>
              {isAdmin && item.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      transition.mutate({
                        redemptionId: item.id,
                        status: "approved",
                      })
                    }
                  >
                    <Check className="size-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      transition.mutate({
                        redemptionId: item.id,
                        status: "rejected",
                      })
                    }
                  >
                    <X className="size-3" />
                    Reject
                  </Button>
                </div>
              ) : null}
              {isAdmin && item.status === "approved" ? (
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() =>
                    transition.mutate({
                      redemptionId: item.id,
                      status: "fulfilled",
                    })
                  }
                >
                  Mark fulfilled
                </Button>
              ) : null}
            </div>
          ))}
          {redemptions.length === 0 ? (
            <p className="p-6 text-sm text-[#687b74]">No gifts redeemed yet.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
