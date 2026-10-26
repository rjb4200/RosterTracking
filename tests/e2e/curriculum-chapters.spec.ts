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
  await pool.query(
    "insert into curriculum_chapters (curriculum_id, part, number, title, position, source_revision) values ($1, 'Firefighter II', '1', 'Incident Scene Operations', 1, 'e2e')",
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

  // Every catalog chapter is offered, grouped by section.
  const chapterSelect = page.getByLabel("Chapter", { exact: true });
  await expect(chapterSelect.locator("optgroup")).toHaveCount(2);
  await expect(
    chapterSelect.locator("option", {
      hasText: "Firefighter I: Chapter 3. Communications",
    }),
  ).toHaveCount(1);
  await expect(
    chapterSelect.locator("option", {
      hasText: "Firefighter II: Chapter 1. Incident Scene Operations",
    }),
  ).toHaveCount(1);

  // A chapter is required once the chosen curriculum has catalog chapters.
  await next.click();
  await expect(
    page.getByText("Complete the highlighted fields."),
  ).toBeVisible();
  await expect(chapterSelect).toHaveAttribute("aria-invalid", "true");

  // The filter narrows the catalog to the matching chapters.
  await page.getByLabel("Filter Chapter").fill("Communications");
  await expect(
    chapterSelect.locator("option", {
      hasText: "Firefighter I: Chapter 3. Communications",
    }),
  ).toHaveCount(1);
  await expect(
    chapterSelect.locator("option", {
      hasText: "Incident Scene Operations",
    }),
  ).toHaveCount(0);

  // A typed chapter is available through the Not listed choice.
  await chapterSelect.selectOption({ label: "Not listed (type one)" });
  await page.getByLabel("Chapter name or number").fill("Custom Chapter 9");
  await expect(
    page.locator('input[name="fireCurriculumChapter"]').first(),
  ).toHaveValue("Custom Chapter 9");

  // Changing the curriculum clears the chapter.
  await page
    .getByLabel("Curriculum", { exact: true })
    .selectOption({ label: "Not listed (type one)" });
  await expect(page.getByLabel("Chapter", { exact: true })).toHaveValue("");
  await page
    .getByLabel("Curriculum", { exact: true })
    .selectOption(curriculumId);
  await expect(page.getByLabel("Chapter", { exact: true })).toHaveValue("");

  const lessonPlan = page.getByLabel("Lesson plan");
  await expect(lessonPlan).toHaveAttribute("rows", "1");
  await expect(lessonPlan).toHaveValue("");

  // Selecting a chapter seeds the empty lesson plan with its title.
  await page.getByLabel("Chapter", { exact: true }).selectOption({
    label: "Firefighter II: Chapter 1. Incident Scene Operations",
  });
  await expect(lessonPlan).toHaveValue("Incident Scene Operations");
  await page
    .getByLabel("Chapter", { exact: true })
    .selectOption({ label: "Firefighter I: Chapter 3. Communications" });
  await expect(lessonPlan).toHaveValue("Communications");

  // Manual text is preserved across chapter changes.
  await lessonPlan.fill("Manual lesson plan");
  await page.getByLabel("Chapter", { exact: true }).selectOption({
    label: "Firefighter II: Chapter 1. Incident Scene Operations",
  });
  await expect(lessonPlan).toHaveValue("Manual lesson plan");

  // An auto-filled title follows the chapter and clears with the curriculum.
  await lessonPlan.fill("");
  await page
    .getByLabel("Chapter", { exact: true })
    .selectOption({ label: "Firefighter I: Chapter 3. Communications" });
  await expect(lessonPlan).toHaveValue("Communications");
  await page
    .getByLabel("Curriculum", { exact: true })
    .selectOption({ label: "Not listed (type one)" });
  await expect(page.getByLabel("Chapter", { exact: true })).toHaveValue("");
  await expect(lessonPlan).toHaveValue("");

  // Restore the curriculum and chapter for the next step.
  await page
    .getByLabel("Curriculum", { exact: true })
    .selectOption(curriculumId);
  await page
    .getByLabel("Chapter", { exact: true })
    .selectOption({ label: "Firefighter I: Chapter 3. Communications" });
  await next.click();
  await expect(page.getByRole("checkbox", { name: "Classroom" })).toBeChecked();
});
