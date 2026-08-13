import { downloadReadingData } from "@/features/exports/export-api";

const mocks = vi.hoisted(() => ({ apiDownload: vi.fn() }));

vi.mock("@/api/client", () => ({ apiDownload: mocks.apiDownload }));

describe("downloadReadingData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates a temporary browser download using the server filename", async () => {
    const blob = new Blob(["Date,Reader\n2026-08-12,Maya\n"]);
    mocks.apiDownload.mockResolvedValue({
      blob,
      filename: "reading-sessions-2026-08-13.csv",
    });
    const createObjectURL = vi.fn().mockReturnValue("blob:reading-data");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    await downloadReadingData("csv");
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(mocks.apiDownload).toHaveBeenCalledWith(
      "/exports/reading-data?format=csv",
    );
    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:reading-data");
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
