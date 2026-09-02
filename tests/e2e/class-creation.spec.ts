import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = process.env.TEST_DATABASE_URL;

test("authorized staff can create and open a class draft", async ({ page }) => {
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and TEST_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;

  const suffix = crypto.randomUUID();
  const pool = new Pool({ connectionString, max: 1 });
  const course = await pool.query<{ id: string }>(
    "insert into courses (name) values ($1) returning id",
    [`E2E Course ${suffix}`],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`E2E Site ${suffix}`],
  );
  const system = await pool.query<{ id: string; name: string }>(
    "insert into reporting_systems (code, name) values ($1, $2) returning id, name",
    [`e2e-${suffix}`, `E2E Reporting ${suffix}`],
  );
  await pool.end();
  const courseId = course.rows[0]?.id;
  const siteId = site.rows[0]?.id;
  const systemName = system.rows[0]?.name;
  if (!courseId || !siteId || !systemName) {
    throw new Error("Class browser fixtures were not created.");
  }

  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/staff/classes/new");
  await page.getByLabel("Course").selectOption(courseId);
  await page.getByLabel("Training site").selectOption(siteId);
  await page.getByLabel(systemName).check();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("Save this sign-in access now")).toBeVisible();
  await page.getByRole("link", { name: "Continue class setup" }).click();

  await page.getByLabel("Session title").fill("E2E Session");
  await page.getByLabel("Credited hours").fill("4");
  await page.getByLabel("Starts").fill("2026-09-10T09:00");
  await page.getByLabel("Ends").fill("2026-09-10T13:00");
  await page.getByRole("button", { name: "Add session" }).click();
  await expect(page.getByText("E2E Session")).toBeVisible();
  await page.getByRole("button", { name: "Open class" }).click();
  await expect(page.getByText("open", { exact: true })).toBeVisible();
});

test("unknown class token returns a generic unavailable response", async ({
  page,
}) => {
  test.skip(!connectionString, "Set TEST_DATABASE_URL.");
  await page.goto("/sign-in/not-a-valid-token");
  await expect(
    page.getByRole("heading", { name: "Class sign-in unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(/ask the instructor/i)).toBeVisible();
});
