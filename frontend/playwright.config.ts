import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "5173";
const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "8000";
const authBypass = process.env.E2E_AUTH_BYPASS === "true";
const allBrowsers = process.env.E2E_ALL_BROWSERS === "true";

const projects = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
];

if (allBrowsers) {
  projects.push(
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: authBypass ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  projects,
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${port}`,
    env: {
      VITE_DEV_AUTH_BYPASS: authBypass ? "true" : "false",
      VITE_API_BASE_URL: `http://127.0.0.1:${apiPort}/api/v1`,
    },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
