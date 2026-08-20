import { expect, test } from "@playwright/test";

test.skip(
  process.env.E2E_AUTH_BYPASS === "true",
  "Runs in the separate signed-out browser pass",
);

test("protects the reading dashboard from signed-out visitors", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
});
