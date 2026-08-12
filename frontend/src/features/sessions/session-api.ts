import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/api/client";
import type { components } from "@/api/schema";

export type ReadingSession = components["schemas"]["ReadingSessionResponse"];
export type ReadingSessionCreate =
  components["schemas"]["ReadingSessionCreate"];
export type ReadingSessionUpdate =
  components["schemas"]["ReadingSessionUpdate"];
export type ActivityType = components["schemas"]["ActivityType"];

export function listReadingSessions(readerId: string) {
  return apiFetch<ReadingSession[]>(
    `/reading-sessions?reader_id=${encodeURIComponent(readerId)}`,
  );
}

export function useReadingSessions(readerId: string | null) {
  return useQuery({
    queryKey: ["reading-sessions", readerId],
    queryFn: () => listReadingSessions(readerId!),
    enabled: Boolean(readerId),
  });
}

export function useCreateReadingSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: ReadingSessionCreate) =>
      apiFetch<ReadingSession>("/reading-sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateSessionData(client),
  });
}

export function useUpdateReadingSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: ReadingSessionUpdate;
    }) =>
      apiFetch<ReadingSession>(`/reading-sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateSessionData(client),
  });
}

export function useDeleteReadingSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<void>(`/reading-sessions/${sessionId}`, { method: "DELETE" }),
    onSuccess: () => invalidateSessionData(client),
  });
}

function invalidateSessionData(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ["reading-sessions"] });
  void client.invalidateQueries({ queryKey: ["books"] });
  void client.invalidateQueries({ queryKey: ["book"] });
}
