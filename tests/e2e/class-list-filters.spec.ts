import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  (process.env.E2E_USE_APPLICATION_DATABASE === "true"
    ? process.env.DATABASE_URL
    : process.env.TEST_DATABASE_URL);

const DAY = 24 * 60 * 60 * 1000;

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

function dateInput(daysAgo: number) {
  const date = new Date(Date.now() - daysAgo * DAY);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface ClassFixture {
  courseName: string;
  freshDraftId: string;
  staleDraftId: string;
  cancelledId: string;
  pinId: string;
  finalizedId: string;
  oldFinalizedId: string;
}

async function seedClassFixture(pool: Pool): Promise<ClassFixture> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const courseName = `E2E Class List ${suffix}`;
  const course = await pool.query<{ id: string }>(
    "insert into courses (name, default_hours) values ($1, 4) returning id",
    [courseName],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`E2E Class List Site ${suffix}`],
  );
  const user = await pool.query<{ id: string }>(
    "insert into users (username, display_name, password_hash) values ($1, 'E2E Class List', 'fixture') returning id",
    [`e2e-class-list-${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`E2E Class List Agency ${suffix}`],
  );
  const student = await pool.query<{ id: string }>(
    "insert into students (first_name, last_name, phone) values ('E2E', $1, $2) returning id",
    [`Class ${suffix}`, `555-${suffix}`],
  );
  const courseId = course.rows[0]?.id;
  const siteId = site.rows[0]?.id;
  const userId = user.rows[0]?.id;
  const agencyId = agency.rows[0]?.id;
  const studentId = student.rows[0]?.id;
  if (!courseId || !siteId || !userId || !agencyId || !studentId) {
    throw new Error("Class list fixture prerequisites failed.");
  }

  const createClass = async (options: {
    status: string;
    createdDaysAgo: number;
    sessionDaysAgo?: number;
    attendance?: boolean;
    finalizedDaysAgo?: number;
  }) => {
    const record = await pool.query<{ id: string }>(
      `insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, cancellation_reason, created_at)
       values ($1, $2, $3, 'classroom', $4, $5, $6, now() - ($7 || ' days')::interval) returning id`,
      [
        courseId,
        siteId,
        userId,
        options.status,
        randomUUID(),
        options.status === "cancelled" ? "fixture cancellation" : null,
        options.createdDaysAgo,
      ],
    );
    const id = record.rows[0]?.id;
    if (!id) throw new Error("Class list fixture class failed.");
    if (options.sessionDaysAgo !== undefined) {
      await pool.query(
        `insert into class_components (class_id, starts_at, ends_at, credited_hours, position)
         values ($1, now() - ($2 || ' days')::interval, now() - ($2 || ' days')::interval + interval '4 hours', 4, 0)`,
        [id, options.sessionDaysAgo],
      );
    }
    if (options.attendance) {
      await pool.query(
        `insert into attendance (class_id, student_id, agency_id, idempotency_key, payload_fingerprint, credited_hours)
         values ($1, $2, $3, $4, 'fixture', 4)`,
        [id, studentId, agencyId, randomUUID()],
      );
    }
    if (options.finalizedDaysAgo !== undefined) {
      await pool.query(
        `insert into finalization_revisions (class_id, revision_number, finalized_by_user_id, finalized_at, encrypted_snapshot, summary)
         values ($1, 1, $2, now() - ($3 || ' days')::interval, 'fixture', '{}'::jsonb)`,
        [id, userId, options.finalizedDaysAgo],
      );
    }
    return id;
  };

  const freshDraftId = await createClass({
    status: "draft",
    createdDaysAgo: 1,
  });
  const staleDraftId = await createClass({
    status: "draft",
    createdDaysAgo: 20,
  });
  const cancelledId = await createClass({
    status: "cancelled",
    createdDaysAgo: 2,
    sessionDaysAgo: 1,
  });
  const pinId = await createClass({
    status: "completed",
    createdDaysAgo: 70,
    sessionDaysAgo: 65,
    attendance: true,
  });
  const finalizedId = await createClass({
    status: "finalized",
    createdDaysAgo: 3,
    sessionDaysAgo: 2,
    finalizedDaysAgo: 1,
  });
  const oldFinalizedId = await createClass({
    status: "finalized",
    createdDaysAgo: 90,
    sessionDaysAgo: 60,
    finalizedDaysAgo: 40,
  });

  return {
    courseName,
    freshDraftId,
    staleDraftId,
    cancelledId,
    pinId,
    finalizedId,
    oldFinalizedId,
  };
}

async function cleanupClassFixture(pool: Pool, fixture: ClassFixture) {
  const deletable = [
    fixture.freshDraftId,
    fixture.staleDraftId,
    fixture.cancelledId,
    fixture.pinId,
  ];
  await pool.query("delete from attendance where class_id = any($1)", [
    deletable,
  ]);
  await pool.query("delete from class_components where class_id = any($1)", [
    deletable,
  ]);
  await pool.query("delete from classes where id = any($1)", [deletable]);
}

test("class list defaults to current work and widens with filters", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating class list coverage runs once on chromium.",
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
  let fixture: ClassFixture | undefined;
  try {
    fixture = await seedClassFixture(pool);
    const {
      courseName,
      staleDraftId,
      cancelledId,
      pinId,
      finalizedId,
      oldFinalizedId,
    } = fixture;

    await signIn(page, username, password);
    await page.goto("/staff/classes");
    await expect(page.locator(".class-list-filters")).toBeVisible();

    const rowFor = (id: string) =>
      page.locator("tr", {
        has: page.locator(`a[href="/staff/classes/${id}"]`),
      });

    await expect(
      page.getByRole("link", { name: courseName }).first(),
    ).toBeVisible();

    await expect(rowFor(staleDraftId)).toHaveCount(0);
    await expect(rowFor(cancelledId)).toHaveCount(0);
    await expect(rowFor(oldFinalizedId)).toHaveCount(0);

    await expect(rowFor(pinId)).toHaveCount(1);
    await expect(
      rowFor(pinId).getByText("overdue", { exact: false }),
    ).toBeVisible();
    await expect(rowFor(pinId).getByText("completed")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /Recently finalized/i }),
    ).toBeVisible();
    await expect(rowFor(finalizedId)).toHaveCount(1);
    await expect(rowFor(finalizedId).getByText("finalized")).toBeVisible();

    await page.getByLabel("Include cancelled").check();
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(rowFor(cancelledId)).toHaveCount(1);

    await page.getByLabel("Include finalized").check();
    await page.locator("#classes-from").fill(dateInput(90));
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(rowFor(oldFinalizedId)).toHaveCount(1);

    await page.locator("#classes-status").selectOption("draft");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(rowFor(staleDraftId)).toHaveCount(1);
  } finally {
    if (fixture) await cleanupClassFixture(pool, fixture);
    await pool.end();
  }
});
