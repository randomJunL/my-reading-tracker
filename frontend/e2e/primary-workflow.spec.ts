import { expect, test } from "@playwright/test";

test.skip(
  process.env.E2E_AUTH_BYPASS !== "true",
  "Requires the disposable authenticated E2E environment",
);

test("completes the primary parent reading workflow", async ({
  page,
}, testInfo) => {
  const readerName = `E2E Reader ${testInfo.project.name}`;
  const bookTitle = `Charlotte's Web (${testInfo.project.name})`;

  await page.route("**/api/v1/book-search?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          source: "google_books",
          external_source_id: `e2e-charlottes-web-${testInfo.project.name}`,
          title: bookTitle,
          subtitle: null,
          authors: ["E. B. White"],
          isbn_10: "0064400557",
          isbn_13: "9780064400558",
          cover_url: null,
          publisher: "HarperCollins",
          published_date: "1952",
          page_count: 192,
          description: "A story of friendship.",
          language: "en",
        },
      ]),
    });
  });

  await page.goto("/readers");
  await expect(page.getByRole("heading", { name: "Readers" })).toBeVisible();

  await page.getByRole("button", { name: "Add reader" }).first().click();
  await page.getByLabel("Name").fill(readerName);
  await page.getByRole("button", { name: "Create reader" }).click();
  await expect(
    page.getByRole("heading", { name: readerName, exact: true }),
  ).toBeVisible();
  await page.getByLabel("Selected reader").selectOption({ label: readerName });

  await page.getByRole("button", { name: "Open account" }).click();
  await expect(
    page.getByRole("heading", { name: "Account", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Owner", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Manages all reader profiles", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Readers", exact: true }).click();

  await page.getByRole("link", { name: "Library", exact: true }).click();
  await page.getByLabel("Search books").fill(bookTitle);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText(bookTitle).first()).toBeVisible();
  await page
    .getByRole("button", { name: `Review and add ${bookTitle}` })
    .click();
  await page.getByLabel("Add as").selectOption("reading");
  await page.getByRole("button", { name: "Save to library" }).click();
  await expect(page.getByLabel(`Status for ${bookTitle}`)).toHaveValue(
    "reading",
  );

  await page.getByRole("button", { name: "Log reading" }).click();
  await page.getByLabel("Minutes").fill("20");
  await page.getByLabel("Start page").fill("1");
  await page.getByLabel("End page").fill("15");
  await page.getByRole("button", { name: "Log reading" }).last().click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText("20 minutes", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(
    page.getByText("20 minutes logged", { exact: false }),
  ).toBeVisible();

  await page.getByRole("link", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: `Edit ${bookTitle} session` }).click();
  await page.getByLabel("Minutes").fill("25");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("25 minutes", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Reports", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download reading history CSV" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/reading.*\.csv$/i);
});
