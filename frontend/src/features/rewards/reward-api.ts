import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/api/client";
import type { components } from "@/api/schema";

export type RewardProgress = components["schemas"]["RewardProgressResponse"];
export type RewardItem = components["schemas"]["RewardItemResponse"];
export type RewardItemCreate = components["schemas"]["RewardItemCreate"];
export type Redemption = components["schemas"]["RedemptionResponse"];
export type RewardTransaction =
  components["schemas"]["RewardTransactionResponse"];

export function getRewardProgress(readerId: string) {
  return apiFetch<RewardProgress>(
    `/rewards/progress?reader_id=${encodeURIComponent(readerId)}`,
  );
}

export function useRewardProgress(readerId: string | null) {
  return useQuery({
    queryKey: ["rewards", "progress", readerId],
    queryFn: () => getRewardProgress(readerId!),
    enabled: Boolean(readerId),
  });
}

export function useRewardItems() {
  return useQuery({
    queryKey: ["rewards", "items"],
    queryFn: () => apiFetch<RewardItem[]>("/reward-items"),
  });
}

export function useRewardTransactions(readerId: string | null) {
  return useQuery({
    queryKey: ["rewards", "transactions", readerId],
    queryFn: () =>
      apiFetch<RewardTransaction[]>(
        `/rewards/transactions?reader_id=${encodeURIComponent(readerId!)}`,
      ),
    enabled: Boolean(readerId),
  });
}

export function useRewardRedemptions(readerId: string | null) {
  return useQuery({
    queryKey: ["rewards", "redemptions", readerId],
    queryFn: () =>
      apiFetch<Redemption[]>(
        `/reward-redemptions?reader_id=${encodeURIComponent(readerId!)}`,
      ),
    enabled: Boolean(readerId),
  });
}

export function useCreateRewardItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: RewardItemCreate) =>
      apiFetch<RewardItem>("/reward-items", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateRewards(client),
  });
}

export function useUpdateRewardItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: object }) =>
      apiFetch<RewardItem>(`/reward-items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateRewards(client),
  });
}

export function useDeleteRewardItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<void>(`/reward-items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => invalidateRewards(client),
  });
}

export function useRedeemReward() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      readerId,
      rewardItemId,
    }: {
      readerId: string;
      rewardItemId: string;
    }) =>
      apiFetch<Redemption>("/reward-redemptions", {
        method: "POST",
        body: JSON.stringify({
          reader_id: readerId,
          reward_item_id: rewardItemId,
        }),
      }),
    onSuccess: () => invalidateRewards(client),
  });
}

export function useTransitionRedemption() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      redemptionId,
      status,
    }: {
      redemptionId: string;
      status: string;
    }) =>
      apiFetch<Redemption>(`/reward-redemptions/${redemptionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => invalidateRewards(client),
  });
}

function invalidateRewards(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ["rewards"] });
}
