import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/api/client";

export type CurrentUser = {
  user_id: string;
  email: string;
  household_id: string;
  household_name: string;
  role: "owner" | "caregiver";
};

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => apiFetch<CurrentUser>("/me"),
    staleTime: 5 * 60_000,
  });
}
