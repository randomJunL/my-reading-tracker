import { apiFetch } from "@/api/client";

vi.mock("@/features/auth/dev-auth", () => ({
  DEV_AUTH_BYPASS: true,
}));

vi.mock("@/features/auth/supabase", () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

describe("apiFetch development auth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("allows the backend to supply the guarded local identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ email: "developer@localhost" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/me");

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(request.headers).has("Authorization")).toBe(false);
  });
});
