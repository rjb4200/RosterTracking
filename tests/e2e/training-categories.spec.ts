import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const FIRE_DESTINATION = "Kentucky Fire Commission";
const KBEMS_DESTINATION = "KBEMS / KEMSIS";
// EMS-only title that must never appear in the Fire picker.
const EMS_ONLY_TITLE = "Geriatric Education for EMS";

test("training-category catalog shows Fire then EMS sections and a kind selector", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Training-category coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff/training-codes");

  await expect(
    page.getByRole("heading", { name: "Training categories" }),
  ).toBeVisible();
  const fireHeading = page.getByRole("heading", { name: "Fire", exact: true });
  const emsHeading = page.getByRole("heading", { name: "EMS", exact: true });
  await expect(fireHeading).toBeVisible();
  await expect(emsHeading).toBeVisible();
  // Fire sits above EMS on the page.
  const fireBox = await fireHeading.boundingBox();
  const emsBox = await emsHeading.boundingBox();
  expect(fireBox && emsBox && fireBox.y < emsBox.y).toBe(true);

  await page.goto("/staff/training-codes/new");
  const kind = page.getByRole("combobox", { name: "Category type" });
  await expect(kind).toBeVisible();
  await expect(kind.locator("option", { hasText: "Fire" })).toHaveCount(1);
  await expect(kind.locator("option", { hasText: "EMS" })).toHaveCount(1);

  // Creating an EMS category lists it (its section is selected by kind), and
  // the form offers the pin and mapping controls.
  const suffix = crypto.randomUUID().slice(0, 8);
  await kind.selectOption("ems");
  await page.getByLabel("Code").fill(`E2E-EMS-${suffix}`);
  await page.getByLabel("Title").fill(`E2E EMS Category ${suffix}`);
  await expect(page.getByRole("combobox", { name: /Maps to/ })).toBeVisible();
  await page.getByLabel(/Pin to top/).check();
  await page.getByRole("button", { name: "Add training category" }).click();
  await expect(page).toHaveURL(/\/staff\/training-codes$/);
  await expect(page.getByText(`E2E EMS Category ${suffix}`)).toBeVisible();
});

test("Fire picker excludes EMS categories and the EMS picker fills the course name", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Training-category coverage runs once on chromium.",
  );
  const connectionString = e2eDatabaseUrl();
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;

  // Ensure the Fire catalog holds a code with a distinctive, run-unique title.
  const fireOnlyTitle = `E2E Fire Only ${crypto.randomUUID().slice(0, 8)}`;
  const pool = new Pool({ connectionString, max: 1 });
  const code = `E2EFO-${crypto.randomUUID().slice(0, 5)}`;
  await pool.query(
    "insert into training_codes (kind, code, title, source_revision) values ('fire', $1, $2, 'e2e')",
    [code, fireOnlyTitle],
  );
  await pool.end();

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  // Fire step: the Category picker offers Fire codes but no EMS-only titles.
  await page.getByLabel(FIRE_DESTINATION).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const fireCategory = page.getByRole("combobox", { name: "Category" });
  await expect(
    fireCategory.locator("option", { hasText: fireOnlyTitle }),
  ).toHaveCount(1);
  await expect(
    fireCategory.locator("option", { hasText: EMS_ONLY_TITLE }),
  ).toHaveCount(0);

  // EMS step: the Category picker offers EMS categories, excludes the Fire-only
  // title, and selecting a category fills the (editable) EMS course name.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByLabel(FIRE_DESTINATION).uncheck();
  await page.getByLabel(KBEMS_DESTINATION).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const emsCategory = page.getByRole("combobox", { name: "Category" });
  await expect(
    emsCategory.locator("option", { hasText: EMS_ONLY_TITLE }),
  ).toHaveCount(1);
  await expect(
    emsCategory.locator("option", { hasText: fireOnlyTitle }),
  ).toHaveCount(0);

  await emsCategory.selectOption({ label: "Airway" });
  const courseName = page.getByLabel("EMS course name");
  await expect(courseName).toHaveValue("Airway");
  await courseName.fill("Airway Review");
  await expect(courseName).toHaveValue("Airway Review");
});

test("a dual Fire and EMS class pre-fills the EMS category from the Fire subject", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Training-category coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");
  await page.getByLabel(FIRE_DESTINATION).check();
  await page.getByLabel(KBEMS_DESTINATION).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Pick the mapped Fire "Airway" code (P0008) on the Fire step.
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: "P0008 — Airway" });
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // The EMS category is pre-filled from the mapping and the course name follows.
  await expect(
    page.getByRole("combobox", { name: "Category" }).locator("option:checked"),
  ).toHaveText("Airway");
  await expect(page.getByLabel("EMS course name")).toHaveValue("Airway");
});
