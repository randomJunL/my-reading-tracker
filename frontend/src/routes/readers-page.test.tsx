import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { ApiError } from "@/api/client";
import type { Reader } from "@/features/readers/reader-api";
import { ReaderSelectionProvider } from "@/features/readers/reader-selection";
import { ReadersPage } from "@/routes/readers-page";

const apiMocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/client")>();
  return { ...original, apiFetch: apiMocks.fetch };
});

const maya: Reader = {
  id: "3e3773ae-f7fc-44a8-b685-a8d90921e6d7",
  household_id: "804cf936-6c17-4399-8927-6317ad30bb77",
  name: "Maya",
  avatar_key: "coral",
  created_at: "2026-08-11T14:00:00Z",
  updated_at: "2026-08-11T14:00:00Z",
};

describe("ReadersPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    apiMocks.fetch.mockReset();
  });

  it("creates a reader and makes the first profile selectable", async () => {
    const user = userEvent.setup();
    apiMocks.fetch.mockImplementation(
      (path: string, init?: RequestInit): Promise<Reader[] | Reader> => {
        if (path === "/readers" && !init?.method) return Promise.resolve([]);
        if (path === "/readers" && init?.method === "POST") {
          return Promise.resolve(maya);
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );
    renderReadersPage();

    await screen.findByRole("heading", { name: "Add your first reader" });
    await user.click(screen.getAllByRole("button", { name: "Add reader" })[0]);
    await user.type(screen.getByLabelText("Name"), "Maya");
    await user.click(screen.getByRole("button", { name: "Create reader" }));

    expect(await screen.findByRole("heading", { name: "Maya" })).toBeVisible();
    expect(screen.getByText("Selected")).toBeVisible();
    expect(apiMocks.fetch).toHaveBeenCalledWith(
      "/readers",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("requires a second explicit confirmation when the reader has history", async () => {
    const user = userEvent.setup();
    apiMocks.fetch.mockImplementation(
      (path: string, init?: RequestInit): Promise<Reader[] | void> => {
        if (path === "/readers" && !init?.method) {
          return Promise.resolve([maya]);
        }
        if (path === `/readers/${maya.id}` && init?.method === "DELETE") {
          return Promise.reject(
            new ApiError("This reader has books or reading history.", 409),
          );
        }
        if (
          path === `/readers/${maya.id}?confirm_history=true` &&
          init?.method === "DELETE"
        ) {
          return Promise.resolve();
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );
    renderReadersPage();

    await screen.findByRole("heading", { name: "Maya" });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete profile" }));

    expect(
      await screen.findByText(/has books or reading history/i),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Delete profile and history" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add your first reader" }),
      ).toBeVisible(),
    );
    expect(apiMocks.fetch).toHaveBeenLastCalledWith(
      `/readers/${maya.id}?confirm_history=true`,
      { method: "DELETE" },
    );
  });
});

function renderReadersPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ReaderSelectionProvider>{children}</ReaderSelectionProvider>
    </QueryClientProvider>
  );
  return render(<ReadersPage />, { wrapper: Wrapper });
}
