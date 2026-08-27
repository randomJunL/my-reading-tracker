import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/api/client";

export type CurrentUser = {
  user_id: string;
  email: string;
  household_id: string;
  household_name: string;
  role: "owner" | "reader";
  reader_id: string | null;
  is_admin: boolean;
};

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => apiFetch<CurrentUser>("/me"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { household_name: string }) =>
      apiFetch<CurrentUser>("/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (currentUser) => {
      queryClient.setQueryData(["current-user"], currentUser);
    },
  });
}
