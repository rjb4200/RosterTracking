import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

test("public landing page distinguishes staff entry paths", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /training records that hold up/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Instructor access" }),
  ).toHaveAttribute("href", "/instructor/login");
  await expect(
    page.getByRole("link", { name: "Training administration" }),
  ).toHaveAttribute("href", "/admin/login");
  await expect(
    page.getByText(/students can select an open class/i),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Instructor access" }),
  ).toBeFocused();
  expect(
    await page
      .locator("body")
      .evaluate((body) => body.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test("purpose-specific login routes share credentials fields", async ({
  page,
}) => {
  for (const path of ["/instructor/login", "/admin/login"]) {
    await page.goto(path);
    await expect(page.getByLabel("Username")).toHaveAttribute("required", "");
    await expect(page.getByLabel("Password")).toHaveAttribute("required", "");
  }
});

test("legacy staff login remains available", async ({ page }) => {
  await page.goto("/staff/login");
  await expect(
    page.getByRole("heading", { name: "Staff login" }),
  ).toBeVisible();
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
    !username || !password || !e2eDatabaseUrl(),
    "Set E2E_STAFF_USERNAME, E2E_STAFF_PASSWORD, and E2E_DATABASE_URL after bootstrapping an E2E staff user.",
  );
  if (!username || !password) return;

  await signIn(page, username, password);
  await expect(page).toHaveURL(/\/staff\/(instructor|admin)$/);

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
