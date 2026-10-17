import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("typing in a search control selects the first match", async ({ page }) => {
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
  const code = `K7-${suffix.slice(0, 6)}`;
  // Seeded catalog titles also contain common words like "hose", so the filter
  // term must be unique to the fixture for the "first match" to be it.
  const uniqueTerm = suffix.slice(0, 8);
  const trainingCode = await pool.query<{ id: string }>(
    "insert into training_codes (kind, code, title, source_revision) values ('fire', $1, $2, 'e2e') returning id",
    [code, `Hose Loads ${uniqueTerm}`],
  );
  const trainingCodeId = trainingCode.rows[0]?.id;
  const fire = await pool.query<{ name: string }>(
    "select name from reporting_systems where code = 'fire' limit 1",
  );
  await pool.end();
  const fireName = fire.rows[0]?.name;
  if (!trainingCodeId || !fireName) {
    throw new Error("Search-control browser fixtures were not created.");
  }

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");
  await page.getByLabel(fireName).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const category = page.getByLabel("Category", { exact: true });
  await page.getByLabel("Filter Category").fill(uniqueTerm);
  await expect(category).toHaveValue(trainingCodeId);

  // A filter with no matches keeps the current selection.
  await page.getByLabel("Filter Category").fill("zzzzzz");
  await expect(category).toHaveValue(trainingCodeId);
});
