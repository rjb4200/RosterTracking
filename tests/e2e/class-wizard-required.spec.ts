import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("wizard highlights missing required fields and groups search with the select", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating class creation coverage runs once on chromium.",
  );
  const connectionString = e2eDatabaseUrl();
  test.skip(
    !connectionString || !username || !password,
    "Set E2E credentials.",
  );
  if (!connectionString || !username || !password) return;

  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const code = `K8-${suffix.slice(0, 6)}`;
  const trainingCode = await pool.query<{ id: string }>(
    "insert into training_codes (code, title, source_revision) values ($1, 'Hose Loads', 'e2e') returning id",
    [code],
  );
  const trainingCodeId = trainingCode.rows[0]?.id;
  const fire = await pool.query<{ name: string }>(
    "select name from reporting_systems where code = 'fire' limit 1",
  );
  await pool.end();
  const fireName = fire.rows[0]?.name;
  if (!trainingCodeId || !fireName) {
    throw new Error("Wizard browser fixtures were not created.");
  }

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  // Destinations step: Next with no selection highlights and stays put.
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Complete the highlighted fields."),
  ).toBeVisible();
  await expect(page.getByText("Report this class to")).toBeVisible();

  // Select Fire and advance.
  await page.getByLabel(fireName).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Fire step: Next with an incomplete subject highlights and stays put.
  await expect(page.getByText("Fire reporting")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Complete the highlighted fields."),
  ).toBeVisible();
  await expect(page.getByText("Fire reporting")).toBeVisible();

  // The grouped control filters and then selects a value.
  await page.getByLabel("Filter Category").fill(code);
  await page
    .getByLabel("Category", { exact: true })
    .selectOption(trainingCodeId);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // The class-and-schedule step is reached once the subject is complete.
  await expect(page.getByLabel("Delivery method")).toBeVisible();
});
