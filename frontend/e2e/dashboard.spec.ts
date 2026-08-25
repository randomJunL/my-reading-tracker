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
    page.getByRole("heading", {
      name: "How will you use My Reading Tracker?",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue as Parent or teacher" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in to your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
});
