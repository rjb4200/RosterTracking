import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("choosing Not listed reveals the curriculum name and an approved pick hides it", async ({
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
  const curriculum = await pool.query<{ id: string }>(
    "insert into curricula (publisher, program_title, version, source_revision) values ('IFSTA', $1, '8th Edition', 'e2e') returning id",
    [`E2E Not Listed ${suffix}`],
  );
  const curriculumId = curriculum.rows[0]?.id;
  const fire = await pool.query<{ name: string }>(
    "select name from reporting_systems where code = 'fire' limit 1",
  );
  await pool.end();
  const fireName = fire.rows[0]?.name;
  if (!curriculumId || !fireName) {
    throw new Error("Not-listed browser fixtures were not created.");
  }

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");
  await page.getByLabel(fireName).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const curriculumControl = page.getByLabel("Curriculum", { exact: true });
  await curriculumControl.selectOption({ label: "Not listed (type one)" });
  await expect(page.getByLabel("Curriculum name")).toBeVisible();
  await page.getByLabel("Curriculum name").fill("An unlisted curriculum");

  // Choosing an approved curriculum hides the free-text name again.
  await curriculumControl.selectOption(curriculumId);
  await expect(page.getByLabel("Curriculum name")).toHaveCount(0);
});
