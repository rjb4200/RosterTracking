import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "../../src/modules/staff-auth/password";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

test("authorized staff can create and open a class in one pass", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating class creation coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
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
  // Reuse a reporting system that has an active requirement set: the
  // application rejects a class whose selected system has none.
  const system = await pool.query<{ id: string; name: string }>(
    `select rs.id, rs.name from reporting_systems rs
     join reporting_requirement_sets rrs
       on rrs.reporting_system_id = rs.id and rrs.is_active = true
     where rs.is_active = true
     order by rs.code
     limit 1`,
  );
  await pool.end();
  const courseId = course.rows[0]?.id;
  const siteId = site.rows[0]?.id;
  const systemName = system.rows[0]?.name;
  if (!courseId || !siteId || !systemName) {
    throw new Error("Class browser fixtures were not created.");
  }

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  // Step 1: destinations.
  await page.getByLabel(systemName).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // The selected destination's step (Fire is informational) precedes class
  // details.
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Class and schedule step.
  await page.getByLabel("Course", { exact: true }).selectOption(courseId);
  await page.getByLabel("Training site", { exact: true }).selectOption(siteId);
  await page.getByLabel("Add a new site").fill(`Inline Site ${suffix}`);
  await page.getByRole("button", { name: "Add site" }).click();
  await page.getByLabel("Add a new agency").fill(`Inline Agency ${suffix}`);
  await page.getByRole("button", { name: "Add agency" }).click();
  await page.getByLabel("Date and start time").fill("2026-09-10T09:00");
  await page.getByLabel("Scheduled duration (hours)").fill("4");
  await page.getByLabel("Require a four-digit student access PIN").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Back navigation retains values.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Course", { exact: true })).toHaveValue(
    courseId,
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Review and create.
  await expect(page.getByText("Review class")).toBeVisible();
  await expect(page.getByText(`Inline Agency ${suffix}`)).toBeVisible();
  await page.getByRole("button", { name: "Create & open" }).click();
  await expect(page.getByText("Class is open")).toBeVisible();
  await expect(page.getByText(/Student PIN: \d{4}/)).toBeVisible();
  await expect(page.getByAltText("Class sign-in QR code")).toBeVisible();
  await page.getByRole("link", { name: "Go to class" }).click();

  await expect(page.getByText("open", { exact: true })).toBeVisible();
  await expect(page.getByText("Live class")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Finish attendance and review" }),
  ).toBeVisible();
});

test("class wizard stays within a narrow viewport", async ({ page }) => {
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  // Narrow phone width: the wizard must not widen the page, and the action row
  // must win the hit test at the Next control (issue #13). This journey is
  // read-only, so it also runs on the mobile-chrome project.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/staff/classes/new");

  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.scrollIntoViewIfNeeded();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Issue #13: the step section must not cover the action row's controls. This
  // is scoped to the section rather than requiring the button to win the hit
  // test, because the Next.js dev overlay also floats over the page in dev.
  const coveredByStep = await next.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const topElement = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return Boolean(topElement?.closest("section.stack-form"));
  });
  expect(coveredByStep).toBe(false);
});

test("class start time defaults to the nearest quarter hour and snaps typed times", async ({
  page,
}) => {
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  // Advance past Destinations and the destination step to the class details.
  await page.getByLabel("Mobile Training Unit").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const startTime = page.getByLabel("Date and start time");

  // The field is pre-filled on the cadence instead of starting empty.
  const initial = await startTime.inputValue();
  expect(initial).toMatch(/T\d{2}:(00|15|30|45)$/);

  // A typed off-grid minute snaps to the nearest quarter hour on blur, and the
  // field shows the value that will be stored.
  await startTime.fill("2026-09-10T09:07");
  await startTime.blur();
  await expect(startTime).toHaveValue("2026-09-10T09:00");

  await startTime.fill("2026-09-10T09:08");
  await startTime.blur();
  await expect(startTime).toHaveValue("2026-09-10T09:15");
});

test("staff workspace exposes the primary class creation path", async ({
  page,
}) => {
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff");
  const createClass = page.getByRole("link", { name: "Create class" });
  await expect(createClass).toBeVisible();
  await createClass.click();
  await expect(page).toHaveURL(/\/staff\/classes\/new$/);
});

test("instructor dashboard limits overdue reminders to assigned classes", async ({
  page,
}) => {
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;

  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const password = "dashboard-test-password";
  const username = `dashboard-${suffix}`;
  const [instructor, otherInstructor, course, site, agency, instructorRole] =
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
        "insert into agencies (name) values ($1) returning id",
        [`Dashboard Agency ${suffix}`],
      ),
      pool.query<{ id: string }>(
        "select id from roles where code = 'instructor' limit 1",
      ),
    ]);
  const instructorId = instructor.rows[0]?.id;
  const otherInstructorId = otherInstructor.rows[0]?.id;
  const courseId = course.rows[0]?.id;
  const siteId = site.rows[0]?.id;
  const agencyId = agency.rows[0]?.id;
  const instructorRoleId = instructorRole.rows[0]?.id;
  if (
    !instructorId ||
    !otherInstructorId ||
    !courseId ||
    !siteId ||
    !agencyId ||
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
    "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
    [courseId, siteId, instructorId, crypto.randomUUID(), agencyId],
  );
  const unrelatedCourse = await pool.query<{ id: string }>(
    "insert into courses (name) values ($1) returning id",
    [`Unrelated Overdue ${suffix}`],
  );
  const unrelatedClass = await pool.query<{ id: string }>(
    "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
    [
      unrelatedCourse.rows[0]?.id,
      siteId,
      otherInstructorId,
      crypto.randomUUID(),
      agencyId,
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

  await signIn(page, username, password);
  await expect(
    page.getByRole("heading", { name: "Overdue rosters" }),
  ).toBeVisible();
  await expect(page.getByText(`Assigned Overdue ${suffix}`)).toBeVisible();
  await expect(page.getByText(`Unrelated Overdue ${suffix}`)).toHaveCount(0);
});

test("unknown class token returns a generic unavailable response", async ({
  page,
}) => {
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
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
