import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("staff can open and print the class sign-in record", async ({ page }) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating record coverage runs once on chromium.",
  );
  const connectionString = e2eDatabaseUrl();
  test.skip(
    !connectionString || !username || !password,
    "Set E2E credentials.",
  );
  if (!connectionString || !username || !password) return;

  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const actor = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [username],
  );
  if (!actor.rows[0]?.id) throw new Error("E2E staff user was not found.");
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Record Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`Record Agency ${suffix}`],
  );
  const klass = await pool.query<{ id: string }>(
    "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
    [
      `Record Course ${suffix}`,
      site.rows[0]?.id,
      actor.rows[0].id,
      crypto.randomUUID(),
      agency.rows[0]?.id,
    ],
  );
  const classId = klass.rows[0]?.id;
  if (!classId) throw new Error("Record class was not created.");
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
    [classId, actor.rows[0].id],
  );
  const student = await pool.query<{ id: string }>(
    "insert into students (first_name, last_name, phone) values ('Record', $1, $2) returning id",
    [`Student ${suffix}`, `555-${suffix}`],
  );
  const attendance = await pool.query<{ id: string }>(
    "insert into attendance (class_id, student_id, agency_id, idempotency_key, payload_fingerprint, signed_in_at, credited_hours) values ($1, $2, $3, $4, 'fixture', now(), '4') returning id",
    [classId, student.rows[0]?.id, agency.rows[0]?.id, crypto.randomUUID()],
  );
  await pool.query(
    "insert into attendance_attestations (attendance_id, rendered_text, text_version, confirmed_at, sign_in_method, originating_ip, request_source_fingerprint, request_correlation_id) values ($1, $2, 1, now(), 'current_phone', '203.0.113.10', 'fixture-source', 'fixture-correlation')",
    [
      attendance.rows[0]?.id,
      `I confirm that I am Record Student ${suffix} and attended this class.`,
    ],
  );
  await pool.end();

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/sign-in-record`);
  await expect(
    page.getByRole("heading", { name: `Record Course ${suffix}` }),
  ).toBeVisible();
  await expect(
    page.getByText(
      `I confirm that I am Record Student ${suffix} and attended this class.`,
    ),
  ).toBeVisible();

  const response = await page.request.get(
    `/api/staff/class-sign-in-record/${classId}`,
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

test("the sign-in record is not available to anonymous visitors", async ({
  request,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;
  const response = await request.get(
    `/api/staff/class-sign-in-record/${crypto.randomUUID()}`,
  );
  expect(response.status()).toBe(404);
});
