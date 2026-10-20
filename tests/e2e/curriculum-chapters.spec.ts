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
  const trainingCode = await pool.query<{ id: string }>(
    "insert into training_codes (kind, code, title, source_revision) values ('fire', $1, 'Hose Loads', 'e2e') returning id",
    [code],
  );
  const trainingCodeId = trainingCode.rows[0]?.id;
  if (!trainingCodeId) throw new Error("E2E training code was not created.");
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
  await page.getByLabel("Filter Category").fill(code);
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption(trainingCodeId);
  await page
    .getByLabel("Curriculum", { exact: true })
    .selectOption(curriculumId);

  // A chapter is required once the chosen curriculum has catalog chapters.
  await next.click();
  await expect(
    page.getByText("Complete the highlighted fields."),
  ).toBeVisible();
  await expect(page.getByText(/Lead and assisting instructors/)).toBeVisible();

  await page
    .getByLabel("Chapter")
    .fill("Firefighter I: Chapter 3. Communications");
  await next.click();
  await expect(page.getByRole("checkbox", { name: "Classroom" })).toBeChecked();
});
