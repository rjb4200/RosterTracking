import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("Fire subject captures a catalog chapter and a book outside the catalog", async ({
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
  const code = `K9-${suffix.slice(0, 6)}`;
  await pool.query(
    "insert into training_codes (code, title, source_revision) values ($1, 'Hose Loads', 'e2e')",
    [code],
  );
  const curriculum = await pool.query<{ id: string }>(
    "insert into curricula (publisher, program_title, version, source_revision) values ('IFSTA', $1, '8th Edition', 'e2e') returning id",
    [`E2E Essentials ${suffix}`],
  );
  const curriculumId = curriculum.rows[0]?.id;
  if (!curriculumId) throw new Error("E2E curriculum was not created.");
  await pool.query(
    "insert into curriculum_chapters (curriculum_id, part, number, title, position, source_revision) values ($1, 'Firefighter I', '3', 'Communications', 0, 'e2e')",
    [curriculumId],
  );
  const fire = await pool.query<{ name: string }>(
    "select name from reporting_systems where code = 'fire' limit 1",
  );
  await pool.end();
  const fireName = fire.rows[0]?.name;
  if (!fireName) throw new Error("E2E fire reporting system is missing.");

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  // Destinations step, then the Fire step.
  await page.getByLabel(fireName).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const next = page.getByRole("button", { name: "Next", exact: true });
  await page.getByLabel("Search training code").fill(code);
  await page
    .getByLabel("Curriculum", { exact: true })
    .selectOption(curriculumId);

  // A chapter is required once the chosen curriculum has catalog chapters.
  await expect(next).toBeDisabled();
  await page
    .getByLabel("Chapter")
    .fill("Firefighter I: Chapter 3. Communications");
  await expect(next).toBeEnabled();

  // A book outside the catalog is still accepted.
  await page.getByLabel("Book not listed (optional)").fill("Custom Book");
  await expect(next).toBeEnabled();
});
