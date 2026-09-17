import { expect, type Locator, type Page, test } from "@playwright/test";
import { Pool } from "pg";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const instructorUsername = process.env.E2E_INSTRUCTOR_USERNAME;
const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD;

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  (process.env.E2E_USE_APPLICATION_DATABASE === "true"
    ? process.env.DATABASE_URL
    : process.env.TEST_DATABASE_URL);

const FIXTURE_COURSE = "E2E Reporting Fixture Course";
const FIXTURE_SITE = "E2E Reporting Fixture Site";
const FIXTURE_USERNAME = "e2e-reporting-fixture";

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/staff/") && url.pathname !== "/staff/login",
  );
}

interface ReportingFixture {
  courseName: string;
  fireSystemId: string;
  kbemsSystemId: string;
  revisionId: string;
}

async function ensureId(
  pool: Pool,
  selectSql: string,
  selectParams: unknown[],
  insertSql: string,
  insertParams: unknown[],
): Promise<string> {
  const existing = await pool.query<{ id: string }>(selectSql, selectParams);
  if (existing.rows[0]?.id) return existing.rows[0].id;
  const inserted = await pool.query<{ id: string }>(insertSql, insertParams);
  const id = inserted.rows[0]?.id;
  if (!id) throw new Error("Reporting fixture insert failed.");
  return id;
}

async function seedReportingFixture(pool: Pool): Promise<ReportingFixture> {
  const systems = await pool.query<{ id: string; code: string }>(
    "select id, code from reporting_systems where code in ('fire', 'kbems', 'fema')",
  );
  const fireSystemId = systems.rows.find((row) => row.code === "fire")?.id;
  const kbemsSystemId = systems.rows.find((row) => row.code === "kbems")?.id;
  const femaSystemId = systems.rows.find((row) => row.code === "fema")?.id;
  if (!fireSystemId || !kbemsSystemId || !femaSystemId) {
    throw new Error("Reporting systems fire, kbems, and fema must exist.");
  }

  const courseId = await ensureId(
    pool,
    "select id from courses where name = $1 limit 1",
    [FIXTURE_COURSE],
    "insert into courses (name, default_hours) values ($1, 4) returning id",
    [FIXTURE_COURSE],
  );
  const siteId = await ensureId(
    pool,
    "select id from training_sites where name = $1 limit 1",
    [FIXTURE_SITE],
    "insert into training_sites (name) values ($1) returning id",
    [FIXTURE_SITE],
  );
  const userId = await ensureId(
    pool,
    "select id from users where username = $1 limit 1",
    [FIXTURE_USERNAME],
    "insert into users (username, display_name, password_hash) values ($1, 'E2E Reporting Fixture', 'fixture') returning id",
    [FIXTURE_USERNAME],
  );
  const classId = await ensureId(
    pool,
    "select id from classes where course_id = $1 order by created_at limit 1",
    [courseId],
    `insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash)
     values ($1, $2, $3, 'classroom', 'finalized', $4) returning id`,
    [courseId, siteId, userId, FIXTURE_USERNAME],
  );

  const component = await pool.query<{ id: string }>(
    "select id from class_components where class_id = $1 limit 1",
    [classId],
  );
  if (!component.rows[0]?.id) {
    await pool.query(
      `insert into class_components (class_id, starts_at, ends_at, credited_hours, position)
       values ($1, '2026-01-15T13:00:00Z', '2026-01-15T17:00:00Z', 4, 1)`,
      [classId],
    );
  }
  const instructor = await pool.query<{ user_id: string }>(
    "select user_id from class_instructors where class_id = $1 and is_lead limit 1",
    [classId],
  );
  if (!instructor.rows[0]?.user_id) {
    await pool.query(
      "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
      [classId, userId],
    );
  }

  const revisionId = await ensureId(
    pool,
    "select id from finalization_revisions where class_id = $1 order by revision_number desc limit 1",
    [classId],
    `insert into finalization_revisions (class_id, revision_number, finalized_by_user_id, encrypted_snapshot, summary)
     values ($1, 1, $2, 'fixture', '{}'::jsonb) returning id`,
    [classId, userId],
  );

  await pool.query(
    "delete from finalization_reporting_statuses where revision_id = $1",
    [revisionId],
  );
  await pool.query(
    `insert into finalization_reporting_statuses (revision_id, reporting_system_id, status)
     values ($1, $2, 'pending'), ($1, $3, 'pending'), ($1, $4, 'pending')`,
    [revisionId, fireSystemId, kbemsSystemId, femaSystemId],
  );

  return {
    courseName: FIXTURE_COURSE,
    fireSystemId,
    kbemsSystemId,
    revisionId,
  };
}

async function retireReportingFixture(
  pool: Pool,
  fixture: ReportingFixture,
): Promise<void> {
  await pool.query(
    `update finalization_reporting_statuses
     set status = 'not_required', reference_number = null, notes = null,
         reported_by_user_id = null, reported_at = null, updated_at = now()
     where revision_id = $1`,
    [fixture.revisionId],
  );
}

function fixtureRow(page: Page, courseName: string): Locator {
  return page.locator("li.member-row").filter({ hasText: courseName });
}

test("reporting queue is available only to configured reporting staff", async ({
  page,
}) => {
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff/reporting");
  await expect(
    page.getByRole("heading", { name: "Reporting queue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Destination work" }),
  ).toBeVisible();
  await expect(page.getByLabel("Destination")).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
});

test("instructor-only staff cannot access the reporting queue", async ({
  page,
}) => {
  test.skip(
    !instructorUsername || !instructorPassword,
    "Set instructor E2E credentials.",
  );
  if (!instructorUsername || !instructorPassword) return;

  await signIn(page, instructorUsername, instructorPassword);
  await page.goto("/staff/reporting");
  await expect(page).toHaveURL(/\/staff\/instructor$/);
});

test("reporting staff complete, defer, filter, and download destination work", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating reporting coverage runs once on chromium.",
  );
  const usableDatabaseUrl =
    databaseUrl && !databaseUrl.startsWith("postgresql://unused")
      ? databaseUrl
      : undefined;
  test.skip(
    !username || !password || !usableDatabaseUrl,
    "Set E2E staff credentials and an E2E database URL.",
  );
  if (!username || !password || !usableDatabaseUrl) return;

  const pool = new Pool({ connectionString: usableDatabaseUrl, max: 1 });
  let fixture: ReportingFixture | undefined;
  try {
    fixture = await seedReportingFixture(pool);
    const { courseName, kbemsSystemId } = fixture;

    await signIn(page, username, password);
    await page.goto("/staff/reporting");

    const fireRow = fixtureRow(page, courseName).filter({
      hasText: "Kentucky Fire Commission:",
    });
    const kbemsRow = fixtureRow(page, courseName).filter({
      hasText: "KBEMS / KEMSIS:",
    });
    const femaRow = fixtureRow(page, courseName).filter({ hasText: "FEMA:" });

    await expect(fireRow).toContainText("pending");
    await expect(kbemsRow).toContainText("pending");
    await expect(femaRow).toContainText("pending");

    await expect(
      fireRow.getByRole("link", { name: "Download roster PDF" }),
    ).toBeVisible();
    await expect(
      kbemsRow.getByRole("link", { name: "Download roster PDF" }),
    ).toBeVisible();
    await expect(
      femaRow.getByRole("link", { name: "Download roster PDF" }),
    ).toHaveCount(0);

    const enteredResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/staff/reporting"),
    );
    await fireRow.getByPlaceholder("Reference number").fill("E2E-FIRE-1");
    await fireRow.getByRole("button", { name: "Mark entered" }).click();
    await enteredResponse;

    await page.goto("/staff/reporting");
    await expect(
      fixtureRow(page, courseName).filter({
        hasText: "Kentucky Fire Commission:",
      }),
    ).toHaveCount(0);
    await expect(
      fixtureRow(page, courseName).filter({ hasText: "KBEMS / KEMSIS:" }),
    ).toContainText("pending");

    await page.goto(
      `/staff/reporting?system=${fixture.fireSystemId}&status=entered`,
    );
    const enteredFire = fixtureRow(page, courseName);
    await expect(enteredFire).toContainText("entered");
    await expect(
      enteredFire.locator('input[name="referenceNumber"]'),
    ).toHaveValue("E2E-FIRE-1");

    await page.goto("/staff/reporting");
    const notRequiredResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/staff/reporting"),
    );
    await fixtureRow(page, courseName)
      .filter({ hasText: "KBEMS / KEMSIS:" })
      .getByRole("button", { name: "Not required" })
      .click();
    await notRequiredResponse;

    await page.goto(
      `/staff/reporting?system=${kbemsSystemId}&status=not_required`,
    );
    await expect(fixtureRow(page, courseName)).toContainText("not required");

    await page.goto(
      `/staff/reporting?system=${kbemsSystemId}&status=not_required&from=2000-01-01&to=2000-01-02`,
    );
    await expect(fixtureRow(page, courseName)).toHaveCount(0);
    await expect(page.getByText("No reporting work is waiting.")).toBeVisible();

    await page.goto(
      `/staff/reporting?system=${kbemsSystemId}&status=not_required&from=2026-01-01&to=2026-01-31`,
    );
    await expect(fixtureRow(page, courseName)).toContainText("not required");
  } finally {
    if (fixture) await retireReportingFixture(pool, fixture);
    await pool.end();
  }
});
