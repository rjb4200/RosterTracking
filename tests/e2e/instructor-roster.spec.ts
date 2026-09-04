import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = process.env.TEST_DATABASE_URL;

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
]) {
  test(`${viewport.name} instructor roster supports manual attendance and removal`, async ({
    page,
  }) => {
    test.skip(
      !username || !password || !connectionString,
      "Set E2E staff credentials and TEST_DATABASE_URL.",
    );
    if (!username || !password || !connectionString) return;
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    const pool = new Pool({ connectionString, max: 1 });
    const suffix = crypto.randomUUID();
    const actor = await pool.query<{ id: string }>(
      "select id from users where username = $1",
      [username],
    );
    if (!actor.rows[0]) throw new Error("E2E staff user was not found.");
    const course = await pool.query<{ id: string }>(
      "insert into courses (name) values ($1) returning id",
      [`Roster Course ${suffix}`],
    );
    const site = await pool.query<{ id: string }>(
      "insert into training_sites (name) values ($1) returning id",
      [`Roster Site ${suffix}`],
    );
    const agency = await pool.query<{ id: string }>(
      "insert into agencies (name) values ($1) returning id",
      [`Roster Agency ${suffix}`],
    );
    const classRecord = await pool.query<{ id: string }>(
      "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash) values ($1, $2, $3, 'in_person', 'open', $4) returning id",
      [
        course.rows[0]?.id,
        site.rows[0]?.id,
        actor.rows[0].id,
        crypto.randomUUID(),
      ],
    );
    const classId = classRecord.rows[0]?.id;
    if (!classId || !agency.rows[0]?.id)
      throw new Error("Roster fixtures were not created.");
    await pool.query(
      "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
      [classId, actor.rows[0].id],
    );
    await pool.query(
      "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, $2, $3, 4)",
      [classId, "2026-09-10T13:00:00Z", "2026-09-10T17:00:00Z"],
    );
    await pool.end();

    await page.goto("/staff/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.goto(`/staff/classes/${classId}/roster`);
    await expect(
      page.getByRole("heading", { name: "Live attendance" }),
    ).toBeVisible();
    await page
      .getByRole("heading", { name: "Add class guest" })
      .locator("..")
      .getByLabel("First name")
      .fill("Tablet");
    await page
      .getByRole("heading", { name: "Add class guest" })
      .locator("..")
      .getByLabel("Last name")
      .fill("Guest");
    await page
      .getByRole("heading", { name: "Add class guest" })
      .locator("..")
      .getByLabel("Represented agency")
      .selectOption(agency.rows[0].id);
    await page.getByRole("button", { name: "Add guest attendance" }).click();
    await expect(page.getByText("Tablet Guest")).toBeVisible();
    await page.getByRole("button", { name: "Remove attendance" }).click();
    await page
      .getByLabel("Confirm attendance removal")
      .getByLabel("Removal reason")
      .fill("E2E correction");
    await page.getByRole("button", { name: "Confirm removal" }).click();
    await expect(page.getByText("E2E correction")).toBeVisible();
  });
}
