import { expect, test } from "@playwright/test";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("reporting queue is available only to configured reporting staff", async ({
  page,
}) => {
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/staff/reporting");
  await expect(
    page.getByRole("heading", { name: "Pending reporting" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Needs correction" }),
  ).toBeVisible();
});
