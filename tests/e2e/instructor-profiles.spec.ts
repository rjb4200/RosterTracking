import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const adminUsername = process.env.E2E_STAFF_USERNAME;
const adminPassword = process.env.E2E_STAFF_PASSWORD;
const instructorUsername = process.env.E2E_INSTRUCTOR_USERNAME;
const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD;
const connectionString = e2eDatabaseUrl();

function randomFfn() {
  const digits = crypto
    .randomUUID()
    .replace(/\D/g, "")
    .padEnd(8, "0")
    .slice(0, 8);
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

test("an instructor maintains their own profile", async ({ page }) => {
  test.skip(
    !instructorUsername || !instructorPassword || !connectionString,
    "Set E2E instructor credentials and E2E_DATABASE_URL.",
  );
  if (!instructorUsername || !instructorPassword) return;

  await signIn(page, instructorUsername, instructorPassword);
  await page.goto("/staff/profile");
  await expect(
    page.getByRole("heading", { name: "Instructor profile" }),
  ).toBeVisible();

  const ffn = randomFfn();
  await page.getByLabel("Firefighter number (FFN)").fill(ffn);
  await page.getByLabel("Fire Instructor level").selectOption("2");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Firefighter number (FFN)")).toHaveValue(ffn);
});

test("an administrator edits a staff profile from account management", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating profile coverage runs once on chromium.",
  );
  test.skip(
    !adminUsername || !adminPassword || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!adminUsername || !adminPassword) return;

  await signIn(page, adminUsername, adminPassword);
  await page.goto("/staff/accounts");
  await expect(
    page.getByRole("heading", { name: "Staff accounts", level: 1 }),
  ).toBeVisible();

  // Edit the signed-in administrator's own row so this journey never races the
  // instructor self-service journey.
  const row = page.locator(".account-profile", { hasText: adminUsername });
  await expect(row).toHaveCount(1);
  await row.getByLabel("Firefighter number (FFN)").fill(randomFfn());
  await row.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();
});
