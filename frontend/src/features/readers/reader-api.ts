import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/api/client";
import type { components } from "@/api/schema";

export type Reader = components["schemas"]["ReaderResponse"];
export type ReaderCreate = components["schemas"]["ReaderCreate"];
export type ReaderUpdate = components["schemas"]["ReaderUpdate"];
export type ReaderLoginInvitation =
  components["schemas"]["ReaderLoginInvitationResponse"];

export const readersQueryKey = ["readers"] as const;

export function listReaders() {
  return apiFetch<Reader[]>("/readers");
}

export function createReader(data: ReaderCreate) {
  return apiFetch<Reader>("/readers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateReader(readerId: string, data: ReaderUpdate) {
  return apiFetch<Reader>(`/readers/${readerId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteReader(readerId: string, confirmHistory = false) {
  const query = confirmHistory ? "?confirm_history=true" : "";
  return apiFetch<void>(`/readers/${readerId}${query}`, { method: "DELETE" });
}

export function useReaders() {
  return useQuery({ queryKey: readersQueryKey, queryFn: listReaders });
}

export function useCreateReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReader,
    onSuccess: (reader) => {
      queryClient.setQueryData<Reader[]>(readersQueryKey, (current = []) => [
        ...current,
        reader,
      ]);
    },
  });
}

export function useUpdateReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      readerId,
      data,
    }: {
      readerId: string;
      data: ReaderUpdate;
    }) => updateReader(readerId, data),
    onSuccess: (reader) => {
      queryClient.setQueryData<Reader[]>(readersQueryKey, (current = []) =>
        current.map((item) => (item.id === reader.id ? reader : item)),
      );
    },
  });
}

export function useDeleteReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      readerId,
      confirmHistory,
    }: {
      readerId: string;
      confirmHistory?: boolean;
    }) => deleteReader(readerId, confirmHistory),
    onSuccess: (_, { readerId }) => {
      queryClient.setQueryData<Reader[]>(readersQueryKey, (current = []) =>
        current.filter((reader) => reader.id !== readerId),
      );
    },
  });
}

export function useReaderLoginInvitations() {
  return useQuery({
    queryKey: ["reader-login-invitations"],
    queryFn: () =>
      apiFetch<ReaderLoginInvitation[]>("/reader-login-invitations"),
  });
}

export function useCreateReaderLoginInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string }) =>
      apiFetch<ReaderLoginInvitation>("/reader-login-invitations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reader-login-invitations"] }),
  });
}

export function useDeleteReaderLoginInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch<void>(`/reader-login-invitations/${invitationId}`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reader-login-invitations"] }),
  });
}
