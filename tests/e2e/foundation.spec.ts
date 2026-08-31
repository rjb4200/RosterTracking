import { expect, test } from "@playwright/test";

test("public landing page directs staff to login", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /training records that hold up/i }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Staff login" }).click();
  await expect(page).toHaveURL(/\/staff\/login$/);
});

test("login fields use browser validation", async ({ page }) => {
  await page.goto("/staff/login");
  await expect(page.getByLabel("Username")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Password")).toHaveAttribute("required", "");
});

test("protected staff page redirects an anonymous visitor", async ({
  page,
}) => {
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login$/);
});

test("configured staff user can log in and log out", async ({ page }) => {
  const username = process.env.E2E_STAFF_USERNAME;
  const password = process.env.E2E_STAFF_PASSWORD;
  test.skip(
    !username || !password || !process.env.TEST_DATABASE_URL,
    "Set E2E_STAFF_USERNAME, E2E_STAFF_PASSWORD, and TEST_DATABASE_URL after bootstrapping an E2E staff user.",
  );
  if (!username || !password) return;

  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff$/);

  await page.getByRole("link", { name: "Students" }).click();
  await expect(
    page.getByRole("heading", { name: "Students", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Courses" }).click();
  await expect(
    page.getByRole("heading", { name: "Courses", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login$/);
});
