import { expect, type Locator, type Page, test } from "@playwright/test";
import { Pool } from "pg";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const instructorUsername = process.env.E2E_INSTRUCTOR_USERNAME;
const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD;
const databaseUrl = e2eDatabaseUrl();

const FIXTURE_COURSE = "E2E Reporting Fixture Course";
const FIXTURE_SITE = "E2E Reporting Fixture Site";
const FIXTURE_AGENCY = "E2E Reporting Fixture Agency";
const FIXTURE_USERNAME = "e2e-reporting-fixture";

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
    "select id, code from reporting_systems where code in ('fire', 'kbems', 'mtu')",
  );
  const fireSystemId = systems.rows.find((row) => row.code === "fire")?.id;
  const kbemsSystemId = systems.rows.find((row) => row.code === "kbems")?.id;
  const mtuSystemId = systems.rows.find((row) => row.code === "mtu")?.id;
  if (!fireSystemId || !kbemsSystemId || !mtuSystemId) {
    throw new Error("Reporting systems fire, kbems, and mtu must exist.");
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
  const agencyId = await ensureId(
    pool,
    "select id from agencies where name = $1 limit 1",
    [FIXTURE_AGENCY],
    "insert into agencies (name) values ($1) returning id",
    [FIXTURE_AGENCY],
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
    `insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id)
     values ($1, $2, $3, 'classroom', 'finalized', $4, $5) returning id`,
    [courseId, siteId, userId, FIXTURE_USERNAME, agencyId],
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
    [revisionId, fireSystemId, kbemsSystemId, mtuSystemId],
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

interface RevisedFixture {
  courseName: string;
  classId: string;
  firstRevisionId: string;
  secondRevisionId: string;
}

/**
 * Seeds the state a reopen-and-re-finalize produces: revision 1 whose Fire
 * destination was already marked entered, and a later revision 2 whose Fire
 * destination is pending again. The queue must surface the supersession.
 */
async function seedRevisedReportingFixture(
  pool: Pool,
): Promise<RevisedFixture> {
  const suffix = crypto.randomUUID();
  const courseName = `E2E Revised Fixture Course ${suffix}`;
  const systems = await pool.query<{ id: string }>(
    "select id from reporting_systems where code = 'fire'",
  );
  const fireSystemId = systems.rows[0]?.id;
  if (!fireSystemId) throw new Error("Reporting system fire must exist.");

  const course = await pool.query<{ id: string }>(
    "insert into courses (name, default_hours) values ($1, 4) returning id",
    [courseName],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`E2E Revised Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`E2E Revised Agency ${suffix}`],
  );
  const user = await pool.query<{ id: string }>(
    "insert into users (username, display_name, password_hash) values ($1, 'E2E Revised Fixture', 'fixture') returning id",
    [`e2e-revised-${suffix}`],
  );
  const courseId = course.rows[0]?.id;
  const siteId = site.rows[0]?.id;
  const agencyId = agency.rows[0]?.id;
  const userId = user.rows[0]?.id;
  if (!courseId || !siteId || !agencyId || !userId) {
    throw new Error("Revised reporting fixture creation failed.");
  }

  const classRecord = await pool.query<{ id: string }>(
    `insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id)
     values ($1, $2, $3, 'classroom', 'finalized', $4, $5) returning id`,
    [courseId, siteId, userId, suffix, agencyId],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId) throw new Error("Revised reporting fixture class failed.");
  await pool.query(
    `insert into class_components (class_id, starts_at, ends_at, credited_hours, position)
     values ($1, '2026-02-10T13:00:00Z', '2026-02-10T17:00:00Z', 4, 1)`,
    [classId],
  );
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
    [classId, userId],
  );

  const first = await pool.query<{ id: string }>(
    `insert into finalization_revisions (class_id, revision_number, finalized_by_user_id, encrypted_snapshot, summary)
     values ($1, 1, $2, 'fixture', '{}'::jsonb) returning id`,
    [classId, userId],
  );
  const second = await pool.query<{ id: string }>(
    `insert into finalization_revisions (class_id, revision_number, finalized_by_user_id, encrypted_snapshot, summary)
     values ($1, 2, $2, 'fixture', '{}'::jsonb) returning id`,
    [classId, userId],
  );
  const firstRevisionId = first.rows[0]?.id;
  const secondRevisionId = second.rows[0]?.id;
  if (!firstRevisionId || !secondRevisionId) {
    throw new Error("Revised reporting fixture revisions failed.");
  }
  await pool.query(
    `insert into finalization_reporting_statuses (revision_id, reporting_system_id, status)
     values ($1, $2, 'entered'), ($3, $2, 'pending')`,
    [firstRevisionId, fireSystemId, secondRevisionId],
  );

  return { courseName, classId, firstRevisionId, secondRevisionId };
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
  test.skip(
    !username || !password || !databaseUrl,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !databaseUrl) return;

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
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
    const mtuRow = fixtureRow(page, courseName).filter({
      hasText: "Mobile Training Unit:",
    });

    await expect(fireRow).toContainText("pending");
    await expect(kbemsRow).toContainText("pending");
    await expect(mtuRow).toContainText("pending");

    await expect(
      fireRow.getByRole("link", { name: "Download roster PDF" }),
    ).toBeVisible();
    await expect(
      kbemsRow.getByRole("link", { name: "Download roster PDF" }),
    ).toBeVisible();
    await expect(
      mtuRow.getByRole("link", { name: "Download roster PDF" }),
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

test("revised destination work names the superseded revision and its status", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating reporting coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !databaseUrl,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !databaseUrl) return;

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  let fixture: RevisedFixture | undefined;
  try {
    fixture = await seedRevisedReportingFixture(pool);

    await signIn(page, username, password);
    await page.goto("/staff/reporting");

    const row = fixtureRow(page, fixture.courseName).filter({
      hasText: "Kentucky Fire Commission:",
    });
    await expect(row).toContainText("pending");
    await expect(row).toContainText("Revised work");
    await expect(row).toContainText("supersedes revision 1");
    // The prior status is outside the default filter yet is still carried.
    await expect(row).toContainText("entered");
    await expect(
      row.getByRole("link", { name: "View revision 1" }),
    ).toHaveAttribute("href", `/staff/classes/${fixture.classId}`);
  } finally {
    if (fixture) {
      await pool.query(
        "update finalization_reporting_statuses set status = 'not_required' where revision_id = any($1::uuid[])",
        [[fixture.firstRevisionId, fixture.secondRevisionId]],
      );
    }
    await pool.end();
  }
});
