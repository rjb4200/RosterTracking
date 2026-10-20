import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

test("destinations drive the wizard steps and capture MTU usage", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating wizard coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;

  const suffix = crypto.randomUUID();
  const pool = new Pool({ connectionString, max: 1 });
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`E2E Destination Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`E2E Destination Agency ${suffix}`],
  );
  await pool.end();
  const siteId = site.rows[0]?.id;
  const agencyId = agency.rows[0]?.id;
  if (!siteId || !agencyId) {
    throw new Error("Destination browser fixtures were not created.");
  }

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  // The Destinations step comes first, and FEMA is no longer offered.
  await expect(page.getByText("Report this class to")).toBeVisible();
  await expect(page.getByLabel("Mobile Training Unit")).toBeVisible();
  await expect(page.getByText("FEMA")).toHaveCount(0);

  // Selecting a destination adds its step; clearing it removes the step.
  const stepItems = page.locator(".class-wizard-steps li");
  await page.getByLabel("Mobile Training Unit").check();
  await expect(stepItems.filter({ hasText: "MTU" })).toBeVisible();
  await page.getByLabel("Kentucky Fire Commission").check();
  await expect(stepItems.filter({ hasText: "Fire" })).toBeVisible();
  await page.getByLabel("Kentucky Fire Commission").uncheck();
  await expect(stepItems.filter({ hasText: "Fire" })).toHaveCount(0);
  // MTU requires an accreditation destination; pair it with KBEMS.
  await page.getByLabel("KBEMS / KEMSIS").check();

  await page.getByRole("button", { name: "Next", exact: true }).click();

  // KBEMS step (ordered before MTU).
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: "Airway" });
  await page.getByLabel("EMS course name").fill(`E2E EMS ${suffix}`);
  await page.getByLabel("Course type").selectOption("continuing_education");
  await page
    .getByLabel("Course description or objectives")
    .fill("Airway management");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // MTU step captures usage.
  await expect(
    page.getByRole("heading", { name: "Mobile Training Unit usage" }),
  ).toBeVisible();
  // The free-text MTU fields live inside a collapsed "Additional details"
  // disclosure, and the legacy mileage field was relabeled.
  await page.getByText("Additional details", { exact: true }).click();
  await page.getByLabel("Other equipment (not listed)").fill("Trailer 4");
  await page.getByLabel("Other / legacy mileage (unattributed)").fill("120");
  await page.getByLabel("Other supplies (not listed)").fill("Gloves");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Class and schedule step. KBEMS sets the class name, so no name field here.
  await page.getByLabel("Training site", { exact: true }).selectOption(siteId);
  await page.getByLabel("Date and start time").fill("2026-09-10T09:00");
  await page.getByLabel("Scheduled duration").selectOption("4");
  await page.getByLabel("Host agency").selectOption(agencyId);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Review summarizes the destination and its captured values.
  await expect(page.getByText("Review class")).toBeVisible();
  await expect(page.getByText("Mobile Training Unit").first()).toBeVisible();
  await expect(page.getByText("120")).toBeVisible();
  await page.getByRole("button", { name: "Create & open" }).click();
  await expect(page.getByText("Class is open")).toBeVisible();
});
