import { expect, type Locator, type Page, test } from "@playwright/test";
import { Pool } from "pg";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

async function seedFireFixtures(pool: Pool, suffix: string) {
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`E2E Fire Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`E2E Fire Agency ${suffix}`],
  );
  const trainingCode = await pool.query<{ id: string }>(
    "insert into training_codes (kind, code, title, source_revision) values ('fire', $1, 'Hose Loads', 'e2e') returning id",
    [`K0000-${suffix.slice(0, 6)}`],
  );
  const curriculum = await pool.query<{ id: string }>(
    `insert into curricula (publisher, program_title, version, additional_requirements, source_revision)
     values ('IFSTA', $1, '8th Edition', 'Approval of AHJ', 'e2e') returning id`,
    [`Essentials of Firefighting ${suffix}`],
  );
  const siteId = site.rows[0]?.id;
  const agencyId = agency.rows[0]?.id;
  const trainingCodeId = trainingCode.rows[0]?.id;
  const curriculumId = curriculum.rows[0]?.id;
  if (!siteId || !agencyId || !trainingCodeId || !curriculumId) {
    throw new Error("Fire browser fixtures were not created.");
  }
  return { siteId, agencyId, trainingCodeId, curriculumId };
}

async function completeClassStep(
  page: Page,
  fixture: { siteId: string; agencyId: string },
) {
  await page
    .getByLabel("Training site", { exact: true })
    .selectOption(fixture.siteId);
  await page.getByLabel("Date and start time").fill("2026-09-10T09:00");
  await page.getByLabel("Scheduled duration (hours)").fill("4");
  await page.getByLabel("Host agency").selectOption(fixture.agencyId);
}

function subjectRow(page: Page, number: number): Locator {
  return page.locator("fieldset").filter({ hasText: `Subject ${number}` });
}

test("captures a single Fire subject", async ({ page }) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating Fire coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;

  const suffix = crypto.randomUUID();
  const pool = new Pool({ connectionString, max: 1 });
  const fixture = await seedFireFixtures(pool, suffix);
  await pool.end();

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");
  await page.getByLabel("Kentucky Fire Commission").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const row1 = subjectRow(page, 1);
  await row1.getByLabel("Category").selectOption(fixture.trainingCodeId);
  // Selecting a training code pre-fills the editable class name.
  await expect(row1.getByLabel("Class name")).toHaveValue("Hose Loads");
  await row1
    .getByLabel("Curriculum", { exact: true })
    .selectOption(fixture.curriculumId);
  await row1.getByLabel("Lesson plan").fill("Chapter 10 Hose & App.");

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await completeClassStep(page, fixture);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByText("Review class")).toBeVisible();
  await page.getByRole("button", { name: "Create & open" }).click();
  await expect(page.getByText("Class is open")).toBeVisible();
});

test("captures a second Fire subject", async ({ page }) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating Fire coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;

  const suffix = crypto.randomUUID();
  const pool = new Pool({ connectionString, max: 1 });
  const fixture = await seedFireFixtures(pool, suffix);
  await pool.end();

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");
  await page.getByLabel("Kentucky Fire Commission").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const row1 = subjectRow(page, 1);
  await row1.getByLabel("Category").selectOption(fixture.trainingCodeId);
  await row1.getByLabel("Lesson plan").fill("Chapter 10");

  await page.getByRole("button", { name: "Add second subject" }).click();
  const row2 = subjectRow(page, 2);
  await row2.getByLabel("Category").selectOption(fixture.trainingCodeId);
  await row2.getByLabel("Class name").fill("SCBA Donning");

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await completeClassStep(page, fixture);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByText("Review class")).toBeVisible();
  await expect(page.getByText("Hose Loads, SCBA Donning")).toBeVisible();
  await page.getByRole("button", { name: "Create & open" }).click();
  await expect(page.getByText("Class is open")).toBeVisible();
});
