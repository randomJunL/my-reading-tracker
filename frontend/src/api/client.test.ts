import { apiFetch } from "@/api/client";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/features/auth/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { getSession: authMocks.getSession } },
}));

vi.mock("@/features/auth/dev-auth", () => ({
  DEV_AUTH_BYPASS: false,
}));

describe("apiFetch", () => {
  beforeEach(() => {
    authMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends the Supabase access token as a bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ household_name: "My Household" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/me");

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });
});
