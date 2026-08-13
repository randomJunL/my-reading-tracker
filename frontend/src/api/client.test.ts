import { apiDownload, apiFetch } from "@/api/client";

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

  it("uses a structured API error message and accepts empty responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: { message: "Confirm deletion to continue." },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/readers/reader-id")).rejects.toMatchObject({
      message: "Confirm deletion to continue.",
      status: 409,
    });
    await expect(apiFetch("/readers/reader-id")).resolves.toBeUndefined();
  });

  it("returns an authenticated download with its server filename", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("Date,Reader\n2026-08-12,Maya\n", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition":
            'attachment; filename="reading-sessions-2026-08-13.csv"',
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const download = await apiDownload("/exports/reading-data?format=csv");

    expect(download.filename).toBe("reading-sessions-2026-08-13.csv");
    expect(await download.blob.text()).toContain("2026-08-12,Maya");
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(request.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
  });
});
