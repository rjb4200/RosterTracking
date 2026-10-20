import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const leadUsername = process.env.E2E_STAFF_USERNAME;
const leadPassword = process.env.E2E_STAFF_PASSWORD;
const fireUsername = process.env.E2E_INSTRUCTOR_USERNAME;
const firePassword = process.env.E2E_INSTRUCTOR_PASSWORD;
const connectionString = e2eDatabaseUrl();

test.setTimeout(120_000);

function skipUnlessEnabled() {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating Fire-signature coverage runs once on chromium.",
  );
  test.skip(
    !leadUsername ||
      !leadPassword ||
      !fireUsername ||
      !firePassword ||
      !connectionString,
    "Set the E2E staff credentials and E2E_DATABASE_URL.",
  );
}

async function createEmsLedFireClass() {
  if (!connectionString || !leadUsername || !fireUsername) {
    throw new Error("E2E credentials are required.");
  }
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = randomUUID();
  const lead = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [leadUsername],
  );
  const fire = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [fireUsername],
  );
  const fireSystem = await pool.query<{ id: string }>(
    "select id from reporting_systems where code = 'fire'",
  );
  const requirement = await pool.query<{ id: string }>(
    "select id from reporting_requirement_sets where reporting_system_id = $1 and is_active = true limit 1",
    [fireSystem.rows[0]?.id],
  );
  if (
    !lead.rows[0] ||
    !fire.rows[0] ||
    !fireSystem.rows[0] ||
    !requirement.rows[0]
  ) {
    await pool.end();
    throw new Error("E2E Fire fixtures were not found.");
  }
  // Make the assistant fire-eligible without changing the non-fire lead.
  const digits = randomUUID().replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
  await pool.query(
    "update users set ffn = $1, instructor_level = 1 where id = $2",
    [`${digits.slice(0, 4)}-${digits.slice(4)}`, fire.rows[0].id],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`EMS Fire Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`EMS Fire Agency ${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
    [
      `EMS Led Fire ${suffix}`,
      site.rows[0]?.id,
      lead.rows[0].id,
      randomUUID(),
      agency.rows[0]?.id,
    ],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId || !site.rows[0] || !agency.rows[0]) {
    await pool.end();
    throw new Error("E2E Fire class fixture failed.");
  }
  await pool.query(
    "insert into class_reporting_systems (class_id, reporting_system_id) values ($1, $2)",
    [classId, fireSystem.rows[0].id],
  );
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true), ($1, $3, false)",
    [classId, lead.rows[0].id, fire.rows[0].id],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, $2, $3, 4)",
    [classId, "2026-09-10T13:00:00Z", "2026-09-10T17:00:00Z"],
  );
  const guest = await pool.query<{ id: string }>(
    "insert into class_guests (class_id, first_name, last_name) values ($1, 'Fire', 'Guest') returning id",
    [classId],
  );
  const attendance = await pool.query<{ id: string }>(
    "insert into attendance (class_id, guest_id, agency_id, idempotency_key, payload_fingerprint, credited_hours) values ($1, $2, $3, $4, 'fixture', 4) returning id",
    [classId, guest.rows[0]?.id, agency.rows[0].id, randomUUID()],
  );
  if (!attendance.rows[0]) {
    await pool.end();
    throw new Error("E2E Fire attendance fixture failed.");
  }
  await pool.query(
    "insert into attendance_reporting_contexts (attendance_id, requirement_set_id) values ($1, $2)",
    [attendance.rows[0].id, requirement.rows[0].id],
  );
  await pool.end();
  return classId;
}

async function createEmsLedFireKbemsClass() {
  if (!connectionString || !leadUsername || !fireUsername) {
    throw new Error("E2E credentials are required.");
  }
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = randomUUID();
  const lead = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [leadUsername],
  );
  const fire = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [fireUsername],
  );
  const fireSystem = await pool.query<{ id: string }>(
    "select id from reporting_systems where code = 'fire'",
  );
  const kbemsSystem = await pool.query<{ id: string }>(
    "select id from reporting_systems where code = 'kbems'",
  );
  const fireRequirement = await pool.query<{ id: string }>(
    "select id from reporting_requirement_sets where reporting_system_id = $1 and is_active = true limit 1",
    [fireSystem.rows[0]?.id],
  );
  const kbemsRequirement = await pool.query<{ id: string }>(
    "select id from reporting_requirement_sets where reporting_system_id = $1 and is_active = true limit 1",
    [kbemsSystem.rows[0]?.id],
  );
  const emsCategory = await pool.query<{ id: string }>(
    "select id from training_codes where kind = 'ems' limit 1",
  );
  if (
    !lead.rows[0] ||
    !fire.rows[0] ||
    !fireSystem.rows[0] ||
    !kbemsSystem.rows[0] ||
    !fireRequirement.rows[0] ||
    !kbemsRequirement.rows[0] ||
    !emsCategory.rows[0]
  ) {
    await pool.end();
    throw new Error("E2E Fire and KBEMS fixtures were not found.");
  }
  const digits = randomUUID().replace(/\D/g, "").padEnd(8, "0").slice(0, 8);
  await pool.query(
    "update users set ffn = $1, instructor_level = 1 where id = $2",
    [`${digits.slice(0, 4)}-${digits.slice(4)}`, fire.rows[0].id],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Both Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`Both Agency ${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id, course_type, course_number, ems_category_id, objectives) values ($1, $2, $3, 'classroom', 'open', $4, $5, 'continuing_education', $6, $7, 'E2E continuing education') returning id",
    [
      `EMS Led Fire and KBEMS ${suffix}`,
      site.rows[0]?.id,
      lead.rows[0].id,
      randomUUID(),
      agency.rows[0]?.id,
      `CE-${suffix.slice(0, 6)}`,
      emsCategory.rows[0].id,
    ],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId || !site.rows[0] || !agency.rows[0]) {
    await pool.end();
    throw new Error("E2E Fire and KBEMS class fixture failed.");
  }
  await pool.query(
    "insert into class_reporting_systems (class_id, reporting_system_id) values ($1, $2), ($1, $3)",
    [classId, fireSystem.rows[0].id, kbemsSystem.rows[0].id],
  );
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true), ($1, $3, false)",
    [classId, lead.rows[0].id, fire.rows[0].id],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, $2, $3, 4)",
    [classId, "2026-09-10T13:00:00Z", "2026-09-10T17:00:00Z"],
  );
  const guest = await pool.query<{ id: string }>(
    "insert into class_guests (class_id, first_name, last_name) values ($1, 'Fire', 'Guest') returning id",
    [classId],
  );
  const attendance = await pool.query<{ id: string }>(
    "insert into attendance (class_id, guest_id, agency_id, idempotency_key, payload_fingerprint, credited_hours) values ($1, $2, $3, $4, 'fixture', 4) returning id",
    [classId, guest.rows[0]?.id, agency.rows[0].id, randomUUID()],
  );
  if (!attendance.rows[0]) {
    await pool.end();
    throw new Error("E2E Fire and KBEMS attendance fixture failed.");
  }
  await pool.query(
    "insert into attendance_reporting_contexts (attendance_id, requirement_set_id) values ($1, $2), ($1, $3)",
    [
      attendance.rows[0].id,
      fireRequirement.rows[0].id,
      kbemsRequirement.rows[0].id,
    ],
  );
  await pool.end();
  return classId;
}

test("an EMS-led Fire class is finalized by the lead and signed by the fire assistant", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!leadUsername || !leadPassword || !fireUsername || !firePassword) return;
  const classId = await createEmsLedFireClass();

  await signIn(page, leadUsername, leadPassword);
  await page.goto(`/staff/classes/${classId}/review`);
  await expect(page.getByText("Post-class review")).toBeVisible();
  await expect(
    page.getByText(/will sign the Fire roster and individual training notice/i),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /I certify/i }).check();
  await page.getByLabel("Signature").fill("E2E EMS Lead");
  await page.getByRole("button", { name: "Finalize roster" }).click();

  await expect(page.getByRole("heading", { name: "Signatures" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Awaiting E2E Instructor/i)).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, fireUsername, firePassword);
  await page.goto(`/staff/classes/${classId}/review`);
  await expect(page.getByRole("heading", { name: "Signatures" })).toBeVisible();
  await page.getByRole("checkbox", { name: /I certify/i }).check();
  await page.getByLabel("Signature").fill("E2E Fire Assistant");
  await page.getByRole("button", { name: "Sign Fire roster" }).click();

  await expect(
    page.getByText(/^Signed by E2E Fire Assistant on/i).first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "View KFS-1A" })).toBeVisible();
});

test("a Fire and KBEMS class issues certificates before the Fire signature", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!leadUsername || !leadPassword || !fireUsername || !firePassword) return;
  const classId = await createEmsLedFireKbemsClass();

  await signIn(page, leadUsername, leadPassword);
  await page.goto(`/staff/classes/${classId}/review`);
  await expect(page.getByText("Post-class review")).toBeVisible();
  await page.getByRole("checkbox", { name: /I certify/i }).check();
  await page.getByLabel("Signature").fill("E2E EMS Lead");
  await page.getByRole("button", { name: "Finalize roster" }).click();

  await expect(page.getByText("Completion certificates")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: "View KFS-1A" })).toHaveCount(0);
  await expect(page.getByText(/Awaiting E2E Instructor/i)).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, fireUsername, firePassword);
  await page.goto(`/staff/classes/${classId}/review`);
  await page.getByRole("checkbox", { name: /I certify/i }).check();
  await page.getByLabel("Signature").fill("E2E Fire Assistant");
  await page.getByRole("button", { name: "Sign Fire roster" }).click();

  await expect(page.getByRole("link", { name: "View KFS-1A" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Completion certificates")).toBeVisible();
});
