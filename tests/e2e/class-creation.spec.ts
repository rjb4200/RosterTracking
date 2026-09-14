import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "../../src/modules/staff-auth/password";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = process.env.TEST_DATABASE_URL;

test("authorized staff can create and open a class draft", async ({ page }) => {
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and TEST_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;

  const suffix = crypto.randomUUID();
  const pool = new Pool({ connectionString, max: 1 });
  const course = await pool.query<{ id: string }>(
    "insert into courses (name) values ($1) returning id",
    [`E2E Course ${suffix}`],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`E2E Site ${suffix}`],
  );
  const system = await pool.query<{ id: string; name: string }>(
    "insert into reporting_systems (code, name) values ($1, $2) returning id, name",
    [`e2e-${suffix}`, `E2E Reporting ${suffix}`],
  );
  await pool.end();
  const courseId = course.rows[0]?.id;
  const siteId = site.rows[0]?.id;
  const systemName = system.rows[0]?.name;
  if (!courseId || !siteId || !systemName) {
    throw new Error("Class browser fixtures were not created.");
  }

  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/staff/classes/new");
  await page.getByLabel("Course").selectOption(courseId);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Course")).toHaveValue(courseId);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Training site").selectOption(siteId);
  await page.getByLabel("Add a new site").fill(`Inline Site ${suffix}`);
  await page.getByRole("button", { name: "Add site" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Date and start time").fill("2026-09-10T09:00");
  await page.getByLabel("Scheduled duration (hours)").fill("4");
  await page.getByLabel("Require a four-digit student access PIN").check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel(systemName).check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Create class" }).click();
  await expect(page.getByText("Student access")).toBeVisible();
  await page.getByRole("link", { name: "Continue class setup" }).click();

  await page.getByRole("button", { name: "Open class" }).click();
  await expect(page.getByText("open", { exact: true })).toBeVisible();
  await expect(page.getByText(/Student PIN: \d{4}/)).toBeVisible();
  await expect(page.getByAltText("Class sign-in QR code")).toBeVisible();
});

test("staff workspace exposes the primary class creation path", async ({
  page,
}) => {
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/staff");
  const createClass = page.getByRole("link", { name: "Create class" });
  await expect(createClass).toBeVisible();
  await createClass.click();
  await expect(page).toHaveURL(/\/staff\/classes\/new$/);
});

test("instructor dashboard limits overdue reminders to assigned classes", async ({
  page,
}) => {
  test.skip(!connectionString, "Set TEST_DATABASE_URL.");
  if (!connectionString) return;

  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const password = "dashboard-test-password";
  const username = `dashboard-${suffix}`;
  const [instructor, otherInstructor, course, site, instructorRole] =
    await Promise.all([
      pool.query<{ id: string }>(
        "insert into users (username, display_name, password_hash) values ($1, $2, $3) returning id",
        [username, "Dashboard Instructor", await hashPassword(password)],
      ),
      pool.query<{ id: string }>(
        "insert into users (username, display_name, password_hash) values ($1, $2, $3) returning id",
        [
          `other-dashboard-${suffix}`,
          "Other Instructor",
          await hashPassword(password),
        ],
      ),
      pool.query<{ id: string }>(
        "insert into courses (name) values ($1) returning id",
        [`Assigned Overdue ${suffix}`],
      ),
      pool.query<{ id: string }>(
        "insert into training_sites (name) values ($1) returning id",
        [`Dashboard Site ${suffix}`],
      ),
      pool.query<{ id: string }>(
        "select id from roles where code = 'instructor' limit 1",
      ),
    ]);
  const instructorId = instructor.rows[0]?.id;
  const otherInstructorId = otherInstructor.rows[0]?.id;
  const courseId = course.rows[0]?.id;
  const siteId = site.rows[0]?.id;
  const instructorRoleId = instructorRole.rows[0]?.id;
  if (
    !instructorId ||
    !otherInstructorId ||
    !courseId ||
    !siteId ||
    !instructorRoleId
  ) {
    await pool.end();
    throw new Error("Dashboard E2E fixtures were not created.");
  }
  await pool.query(
    "insert into user_roles (user_id, role_id) values ($1, $2), ($3, $2)",
    [instructorId, instructorRoleId, otherInstructorId],
  );
  const assignedClass = await pool.query<{ id: string }>(
    "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash) values ($1, $2, $3, 'classroom', 'open', $4) returning id",
    [courseId, siteId, instructorId, crypto.randomUUID()],
  );
  const unrelatedCourse = await pool.query<{ id: string }>(
    "insert into courses (name) values ($1) returning id",
    [`Unrelated Overdue ${suffix}`],
  );
  const unrelatedClass = await pool.query<{ id: string }>(
    "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash) values ($1, $2, $3, 'classroom', 'open', $4) returning id",
    [
      unrelatedCourse.rows[0]?.id,
      siteId,
      otherInstructorId,
      crypto.randomUUID(),
    ],
  );
  const assignedClassId = assignedClass.rows[0]?.id;
  const unrelatedClassId = unrelatedClass.rows[0]?.id;
  if (!assignedClassId || !unrelatedClassId) {
    await pool.end();
    throw new Error("Dashboard E2E classes were not created.");
  }
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true), ($3, $4, true)",
    [assignedClassId, instructorId, unrelatedClassId, otherInstructorId],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, now() - interval '2 days', now() - interval '47 hours', 1), ($2, now() - interval '2 days', now() - interval '47 hours', 1)",
    [assignedClassId, unrelatedClassId],
  );
  await pool.end();

  await page.goto("/instructor/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Overdue rosters" }),
  ).toBeVisible();
  await expect(page.getByText(`Assigned Overdue ${suffix}`)).toBeVisible();
  await expect(page.getByText(`Unrelated Overdue ${suffix}`)).toHaveCount(0);
});

test("unknown class token returns a generic unavailable response", async ({
  page,
}) => {
  test.skip(!connectionString, "Set TEST_DATABASE_URL.");
  await page.goto("/sign-in/not-a-valid-token");
  await expect(page).toHaveURL(/\/sign-in\?status=unavailable$/);
  await expect(
    page.getByRole("heading", { name: "Class sign-in unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(/ask the instructor/i)).toBeVisible();
});

test("unknown public class code returns a generic unavailable response", async ({
  page,
}) => {
  await page.goto("/ZZZZ");
  await expect(page).toHaveURL(/\/sign-in\?status=unavailable$/);
  await expect(
    page.getByRole("heading", { name: "Class sign-in unavailable" }),
  ).toBeVisible();
});
