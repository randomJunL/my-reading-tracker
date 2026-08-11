import { API_BASE_URL } from "@/api/config";
import { DEV_AUTH_BYPASS } from "@/features/auth/dev-auth";
import { supabase } from "@/features/auth/supabase";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = DEV_AUTH_BYPASS
    ? null
    : ((await supabase?.auth.getSession())?.data.session ?? null);
  if (!session && !DEV_AUTH_BYPASS) {
    throw new ApiError("Authentication is required", 401);
  }

  const headers = new Headers(init.headers);
  if (session) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = "The request could not be completed";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the safe fallback for non-JSON errors.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
