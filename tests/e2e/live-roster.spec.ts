import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

// The poll interval in live-roster.tsx; wait past it to observe polling.
const OBSERVATION_WINDOW_MS = 12_000;
const ROSTER_ROUTE = "/api/staff/class-roster/";

function skipUnlessEnabled() {
  test.skip(
    test.info().project.name !== "chromium",
    "Live roster coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
}

async function createOpenClass(sessionEndsAt: string) {
  if (!connectionString) throw new Error("E2E_DATABASE_URL is required.");
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const actor = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [username],
  );
  if (!actor.rows[0]) throw new Error("E2E staff user was not found.");
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Live Roster Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`Live Roster Agency ${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
    [
      `Live Roster Course ${suffix}`,
      site.rows[0]?.id,
      actor.rows[0].id,
      crypto.randomUUID(),
      agency.rows[0]?.id,
    ],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId || !agency.rows[0]?.id)
    throw new Error("Live roster fixtures were not created.");
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
    [classId, actor.rows[0].id],
  );
  const sessionStartsAt = new Date(
    new Date(sessionEndsAt).getTime() - 4 * 60 * 60 * 1000,
  ).toISOString();
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, $2, $3, 4)",
    [classId, sessionStartsAt, sessionEndsAt],
  );
  await pool.end();
  return { classId, agencyId: agency.rows[0].id };
}

async function recordSignIn(classId: string, agencyId: string) {
  if (!connectionString) throw new Error("E2E_DATABASE_URL is required.");
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const student = await pool.query<{ id: string }>(
    "insert into students (first_name, last_name, phone) values ($1, $2, $3) returning id",
    [
      "Polled",
      "Student",
      `+1860${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, "0")}`,
    ],
  );
  if (!student.rows[0]) throw new Error("Student fixture was not created.");
  await pool.query(
    "insert into attendance (class_id, student_id, agency_id, idempotency_key, payload_fingerprint, credited_hours) values ($1, $2, $3, $4, $5, 4)",
    [classId, student.rows[0].id, agencyId, suffix, `e2e-${suffix}`],
  );
  await pool.end();
}

test("a new sign-in appears in the roster without reloading the page", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;

  // A session that has not ended yet, so polling is active.
  const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { classId, agencyId } = await createOpenClass(endsAt);

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);
  await expect(page.getByText("0 signed-in students")).toBeVisible();

  // A full reload would count as a navigation; a client-side refresh would not.
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });

  await recordSignIn(classId, agencyId);

  await expect(page.getByText("Polled Student")).toBeVisible({
    timeout: OBSERVATION_WINDOW_MS + 10_000,
  });
  await expect(page.getByText("1 signed-in students")).toBeVisible();
  expect(navigations).toBe(0);
});

test("refreshing pauses while the tab is hidden", async ({ page }) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;

  const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { classId } = await createOpenClass(endsAt);

  await page.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
  });

  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes(ROSTER_ROUTE)) requests += 1;
  });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);
  await page.waitForTimeout(OBSERVATION_WINDOW_MS);

  expect(requests).toBe(0);
});

test("refreshing stops once the grace period after the last session passes", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;

  // Well past the session end plus the four-hour grace period.
  const { classId } = await createOpenClass("2026-01-01T17:00:00Z");

  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes(ROSTER_ROUTE)) requests += 1;
  });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);
  await expect(page.getByText("0 signed-in students")).toBeVisible();
  await page.waitForTimeout(OBSERVATION_WINDOW_MS);

  expect(requests).toBe(0);
});
