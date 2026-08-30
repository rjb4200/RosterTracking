import { expect, test } from "@playwright/test";

test("public landing page directs staff to login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /training records that hold up/i })).toBeVisible();
  await page.getByRole("link", { name: "Staff login" }).click();
  await expect(page).toHaveURL(/\/staff\/login$/);
});

test("login fields use browser validation", async ({ page }) => {
  await page.goto("/staff/login");
  await expect(page.getByLabel("Username")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Password")).toHaveAttribute("required", "");
});

test("protected staff page redirects an anonymous visitor", async ({ page }) => {
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login$/);
});

test("configured staff user can log in and log out", async ({ page }) => {
  test.skip(
    !process.env.E2E_STAFF_USERNAME || !process.env.E2E_STAFF_PASSWORD || !process.env.TEST_DATABASE_URL,
    "Set E2E_STAFF_USERNAME, E2E_STAFF_PASSWORD, and TEST_DATABASE_URL after bootstrapping an E2E staff user.",
  );

  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(process.env.E2E_STAFF_USERNAME!);
  await page.getByLabel("Password").fill(process.env.E2E_STAFF_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff$/);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login$/);
});
