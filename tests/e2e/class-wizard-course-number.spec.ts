import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

const FIRE_DESTINATION = "Kentucky Fire Commission";
const KBEMS_DESTINATION = "KBEMS / KEMSIS";
// A standalone muted token; the base input class also contains
// `placeholder:text-muted-foreground`, which must not count as a match.
const MUTED_CLASS = /(^|\s)text-muted-foreground(\s|$)/;

test("KBEMS step offers an editable course number for a non-initial class", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Wizard course-number coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  await page.getByLabel(KBEMS_DESTINATION).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("EMS course name").fill("EMT Refresher");
  await page.getByLabel("Course type").selectOption("refresher");

  // The field is present and editable, shown as optional (muted), for a
  // non-initial class.
  const courseNumber = page.getByLabel("Course number");
  await expect(courseNumber).toBeVisible();
  await expect(courseNumber).toBeEditable();
  await expect(courseNumber).toHaveClass(MUTED_CLASS);
  await expect(courseNumber).toHaveValue("");

  // A manual entry is retained.
  await courseNumber.fill("MANUAL-9");
  await expect(courseNumber).toHaveValue("MANUAL-9");

  // Initial certification makes the same field required.
  await page.getByLabel("Course type").selectOption("initial_certification");
  await expect(courseNumber).not.toHaveClass(MUTED_CLASS);
});

test("dual Fire and EMS class pre-fills the course number from the Fire training code", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Wizard course-number coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;

  const suffix = crypto.randomUUID();
  const code = `A${suffix.slice(0, 4).toUpperCase()}`;
  const pool = new Pool({ connectionString, max: 1 });
  const trainingCode = await pool.query<{ id: string }>(
    "insert into training_codes (code, title, source_revision) values ($1, 'Hose Loads', 'e2e') returning id",
    [code],
  );
  await pool.end();
  const trainingCodeId = trainingCode.rows[0]?.id;
  if (!trainingCodeId) {
    throw new Error("Course-number browser fixture was not created.");
  }

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  await page.getByLabel(FIRE_DESTINATION).check();
  await page.getByLabel(KBEMS_DESTINATION).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Fire step: choose a training code (its title pre-fills the class name).
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption(trainingCodeId);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // KBEMS step: the course number is pre-filled from the Fire training code.
  await page.getByLabel("EMS course name").fill("EMT Refresher");
  await page.getByLabel("Course type").selectOption("refresher");
  const courseNumber = page.getByLabel("Course number");
  await expect(courseNumber).toHaveValue(code);

  // A manual overwrite is retained and not re-seeded.
  await courseNumber.fill("OVERRIDE-1");
  await page.getByLabel("EMS course name").fill("EMT Refresher II");
  await expect(courseNumber).toHaveValue("OVERRIDE-1");
});
