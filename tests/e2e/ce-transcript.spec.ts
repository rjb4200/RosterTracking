import { createCipheriv, randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

/** Mirrors the application's credential envelope so the snapshot is readable. */
function encryptSnapshot(plaintext: string): string {
  const key = Buffer.from(
    process.env.CREDENTIAL_ENCRYPTION_KEY ?? "",
    "base64",
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

const FROM = "2026-01-01";
const TO = "2026-12-31";

test("staff generate a student CE transcript with and without certificates", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating transcript coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;

  const suffix = crypto.randomUUID();
  const pool = new Pool({ connectionString, max: 1 });
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`E2E Transcript Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`E2E Transcript Agency ${suffix}`],
  );
  const user = await pool.query<{ id: string }>(
    "insert into users (username, display_name, password_hash) values ($1, 'E2E Transcript Instructor', 'fixture') returning id",
    [`e2e-transcript-${suffix}`],
  );
  const student = await pool.query<{ id: string }>(
    "insert into students (first_name, last_name, phone) values ('Ada', $1, $2) returning id",
    [`Lovelace ${suffix}`, `+1555${Date.now() % 10_000_000}`],
  );
  const category = await pool.query<{ id: string }>(
    "select id from training_codes where kind = 'ems' order by is_pinned desc, id limit 1",
  );
  const kbems = await pool.query<{ id: string }>(
    "select id from reporting_systems where code = 'kbems'",
  );
  const siteId = site.rows[0]?.id;
  const agencyId = agency.rows[0]?.id;
  const userId = user.rows[0]?.id;
  const studentId = student.rows[0]?.id;
  const categoryId = category.rows[0]?.id;
  const kbemsSystemId = kbems.rows[0]?.id;
  if (
    !siteId ||
    !agencyId ||
    !userId ||
    !studentId ||
    !categoryId ||
    !kbemsSystemId
  ) {
    await pool.end();
    throw new Error("Transcript browser fixtures were not created.");
  }

  const classRecord = await pool.query<{ id: string }>(
    `insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id, ems_category_id, course_type, course_number)
     values ($1, $2, $3, 'classroom', 'finalized', $4, $5, $6, 'continuing_education', 'CE-1') returning id`,
    [
      `E2E Transcript Course ${suffix}`,
      siteId,
      userId,
      suffix,
      agencyId,
      categoryId,
    ],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId) {
    await pool.end();
    throw new Error("Transcript browser class was not created.");
  }
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours, position) values ($1, '2026-06-05T13:00:00Z', '2026-06-05T15:00:00Z', 2, 1)",
    [classId],
  );
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
    [classId, userId],
  );
  await pool.query(
    "insert into class_reporting_systems (class_id, reporting_system_id) values ($1, $2)",
    [classId, kbemsSystemId],
  );
  const attendance = await pool.query<{ id: string }>(
    `insert into attendance (class_id, student_id, agency_id, idempotency_key, payload_fingerprint, credited_hours)
     values ($1, $2, $3, $4, $4, 2) returning id`,
    [classId, studentId, agencyId, suffix],
  );
  const attendanceId = attendance.rows[0]?.id;
  if (!attendanceId) {
    await pool.end();
    throw new Error("Transcript browser attendance was not created.");
  }

  const snapshot = {
    class: {
      courseName: `E2E Transcript Course ${suffix}`,
      siteName: `E2E Transcript Site ${suffix}`,
      courseType: "continuing_education",
      courseNumber: "CE-1",
      completedAt: "2026-06-05T14:00:00.000Z",
    },
    destinations: [{ code: "kbems", name: "KBEMS / KEMSIS" }],
    signature: {
      name: "E2E Transcript Instructor",
      signedAt: "2026-06-05T15:00:00.000Z",
      attestationVersion: "roster-attestation-001",
    },
    instructors: [
      {
        name: "E2E Transcript Instructor",
        isLead: true,
        ffn: null,
        level: null,
      },
    ],
    components: [
      {
        title: null,
        startsAt: "2026-06-05T13:00:00.000Z",
        endsAt: "2026-06-05T15:00:00.000Z",
        creditedHours: "2",
      },
    ],
    attendance: [
      {
        attendanceId,
        agencyName: `E2E Transcript Agency ${suffix}`,
        creditedHours: "2",
        firstName: "Ada",
        lastName: `Lovelace ${suffix}`,
        guestFirstName: null,
        guestLastName: null,
        email: null,
      },
    ],
    fieldSnapshots: [],
    credentialSnapshots: [],
  };
  const revision = await pool.query<{ id: string }>(
    `insert into finalization_revisions (class_id, revision_number, finalized_by_user_id, encrypted_snapshot, summary)
     values ($1, 1, $2, $3, '{}'::jsonb) returning id`,
    [classId, userId, encryptSnapshot(JSON.stringify(snapshot))],
  );
  const revisionId = revision.rows[0]?.id;
  if (!revisionId) {
    await pool.end();
    throw new Error("Transcript browser revision was not created.");
  }
  await pool.query(
    "insert into finalization_reporting_statuses (revision_id, reporting_system_id, status) values ($1, $2, 'pending')",
    [revisionId, kbemsSystemId],
  );
  await pool.end();

  await signIn(page, username, password);
  await page.goto("/staff/reports");
  await expect(
    page.getByRole("option", { name: "Student CE Transcript" }),
  ).toHaveCount(1);

  const transcript = await page.request.get(
    `/api/staff/reports?report=student-ce-transcript&from=${FROM}&to=${TO}&student=${studentId}`,
  );
  expect(transcript.status()).toBe(200);
  expect(transcript.headers()["content-type"]).toContain("application/pdf");
  expect(transcript.headers()["content-disposition"] ?? "").toContain(
    "ce-transcript",
  );

  const packet = await page.request.get(
    `/api/staff/reports?report=student-ce-transcript&from=${FROM}&to=${TO}&student=${studentId}&certificates=1`,
  );
  expect(packet.status()).toBe(200);
  expect(packet.headers()["content-type"]).toContain("application/pdf");
  expect(packet.headers()["content-disposition"] ?? "").toContain(
    "with-certificates",
  );
});
