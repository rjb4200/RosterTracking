import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const elevatedUsername = process.env.E2E_ELEVATED_STAFF_USERNAME;
const elevatedPassword = process.env.E2E_ELEVATED_STAFF_PASSWORD;
const connectionString = process.env.TEST_DATABASE_URL;

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
]) {
  test(`${viewport.name} completed review supports roster correction and finalization`, async ({
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
      "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash) values ($1, $2, $3, 'classroom', 'open', $4) returning id",
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
    await page.goto(`/staff/classes/${classId}`);
    await expect(
      page.getByRole("heading", { name: "Live class" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copy sign-in link" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Full-screen QR" }),
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
    const reviewPool = new Pool({ connectionString, max: 1 });
    await reviewPool.query(
      "update classes set status = 'completed', completed_at = now() where id = $1",
      [classId],
    );
    await reviewPool.end();
    await page.goto(`/staff/classes/${classId}/review`);
    await expect(
      page.getByRole("heading", { name: "Completed class review" }),
    ).toBeVisible();
    await page.getByLabel("Credit").fill("3.5");
    await page.getByLabel("Adjustment reason").selectOption("Left Early");
    await page.getByRole("button", { name: "Update credit" }).click();
    await expect(page.getByText("Roster updated.")).toBeVisible();
    await page.getByRole("button", { name: "Finalize roster" }).click();
    await expect
      .poll(async () => {
        const finalizedPool = new Pool({ connectionString, max: 1 });
        const result = await finalizedPool.query<{ status: string }>(
          "select status from classes where id = $1",
          [classId],
        );
        await finalizedPool.end();
        return result.rows[0]?.status;
      })
      .toBe("finalized");
  });
}

test("elevated staff can open an unassigned completed-class review", async ({
  page,
}) => {
  test.skip(
    !elevatedUsername || !elevatedPassword || !connectionString,
    "Set elevated E2E staff credentials and TEST_DATABASE_URL.",
  );
  if (!elevatedUsername || !elevatedPassword || !connectionString) return;
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const elevated = await pool.query<{ id: string }>(
    "select u.id from users u join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id where u.username = $1 and r.code in ('administrator', 'training-major') and r.is_active = true limit 1",
    [elevatedUsername],
  );
  if (!elevated.rows[0])
    throw new Error("Elevated E2E user needs an active elevated role.");
  const course = await pool.query<{ id: string }>(
    "insert into courses (name) values ($1) returning id",
    [`Elevated Review Course ${suffix}`],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Elevated Review Site ${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, completed_at) values ($1, $2, $3, 'classroom', 'completed', $4, now()) returning id",
    [
      course.rows[0]?.id,
      site.rows[0]?.id,
      elevated.rows[0].id,
      crypto.randomUUID(),
    ],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId) throw new Error("Completed review fixture was not created.");
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, $2, $3, 4)",
    [classId, "2026-09-10T13:00:00Z", "2026-09-10T17:00:00Z"],
  );
  await pool.end();

  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(elevatedUsername);
  await page.getByLabel("Password").fill(elevatedPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto(`/staff/classes/${classId}/review`);
  await expect(
    page.getByRole("heading", { name: "Completed class review" }),
  ).toBeVisible();
});
