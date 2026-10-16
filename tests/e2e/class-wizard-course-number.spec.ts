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
const NEW_NUMBER_LABEL = "Type a new number";

async function seedTrainingCode(code: string): Promise<string> {
  const pool = new Pool({ connectionString, max: 1 });
  const trainingCode = await pool.query<{ id: string }>(
    "insert into training_codes (kind, code, title, source_revision) values ('fire', $1, 'Hose Loads', 'e2e') returning id",
    [code],
  );
  await pool.end();
  const trainingCodeId = trainingCode.rows[0]?.id;
  if (!trainingCodeId) {
    throw new Error("Course-number browser fixture was not created.");
  }
  return trainingCodeId;
}

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
  const trainingCodeId = await seedTrainingCode(code);

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

test("initial certification drops the Fire code and warns on a malformed number", async ({
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

  const code = `B${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const trainingCodeId = await seedTrainingCode(code);

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  await page.getByLabel(FIRE_DESTINATION).check();
  await page.getByLabel(KBEMS_DESTINATION).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption(trainingCodeId);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("EMS course name").fill("EMT Initial");
  await page.getByLabel("Course type").selectOption("initial_certification");
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: "Airway" });

  // The Fire training code is not carried into an initial-certification number;
  // the new-number input starts empty.
  const numberSelect = page.getByRole("combobox", { name: "Course number" });
  await expect(page.getByLabel("New course number")).toHaveValue("");

  // A malformed value warns and advances only after acknowledgement.
  await numberSelect.selectOption({ label: NEW_NUMBER_LABEL });
  await page.getByLabel("New course number").fill("126-26-02-X");
  await page
    .getByLabel("Course description or objectives")
    .fill("Initial EMT certification");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Check the course number")).toBeVisible();
  await page.getByRole("button", { name: "Use this number" }).click();
  await expect(page.getByText("Check the course number")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "KBEMS reporting" }),
  ).toBeHidden();
});

test("initial certification accepts a correctly formatted number and normalizes it", async ({
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

  await page.getByLabel("EMS course name").fill("EMT Initial");
  await page.getByLabel("Course type").selectOption("initial_certification");
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: "Airway" });
  await page
    .getByRole("combobox", { name: "Course number" })
    .selectOption({ label: NEW_NUMBER_LABEL });
  await page.getByLabel("New course number").fill("126-26-77-r");
  await page
    .getByLabel("Course description or objectives")
    .fill("Initial EMT certification");

  // A correctly shaped number advances with no warning.
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Check the course number")).toBeHidden();

  // Returning shows the stored value normalized to uppercase.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("New course number")).toHaveValue("126-26-77-R");
});

test("initial certification offers recently used numbers for selection", async ({
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
  const recentNumber = `126-26-88-R`;
  const agencyName = `E2E Initial Cert Agency ${suffix}`;
  const userUsername = `e2e-initial-cert-${suffix}`;
  const pool = new Pool({ connectionString, max: 1 });
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [agencyName],
  );
  const user = await pool.query<{ id: string }>(
    "insert into users (username, display_name, password_hash) values ($1, 'E2E Initial Cert', 'fixture') returning id",
    [userUsername],
  );
  await pool.query(
    `insert into classes (name, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id, course_type, course_number)
     values ('E2E Initial Cert Fixture', $1, 'online', 'open', $2, $3, 'initial_certification', $4)`,
    [user.rows[0]?.id, userUsername, agency.rows[0]?.id, recentNumber],
  );
  await pool.end();

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");
  await page.getByLabel(KBEMS_DESTINATION).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("EMS course name").fill("EMT Initial");
  await page.getByLabel("Course type").selectOption("initial_certification");

  const numberSelect = page.getByRole("combobox", { name: "Course number" });
  await expect(
    numberSelect.locator("option", { hasText: recentNumber }),
  ).toHaveCount(1);
  await numberSelect.selectOption({ label: recentNumber });
  await expect(numberSelect).toHaveValue(recentNumber);
});
