import { createCipheriv, randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

/**
 * Mirrors the application's credential envelope (AES-256-GCM, base64
 * iv.tag.ciphertext) so the fixture revision is readable by the server.
 */
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
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

test("staff download completion certificates for a finalized KBEMS class", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating certificate coverage runs once on chromium.",
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
    [`E2E Certificate Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`E2E Certificate Agency ${suffix}`],
  );
  const user = await pool.query<{ id: string }>(
    "insert into users (username, display_name, password_hash) values ($1, 'E2E Cert Instructor', 'fixture') returning id",
    [`e2e-cert-${suffix}`],
  );
  const kbems = await pool.query<{ id: string }>(
    "select id from reporting_systems where code = 'kbems'",
  );
  const siteId = site.rows[0]?.id;
  const agencyId = agency.rows[0]?.id;
  const userId = user.rows[0]?.id;
  const kbemsSystemId = kbems.rows[0]?.id;
  if (!siteId || !agencyId || !userId || !kbemsSystemId) {
    await pool.end();
    throw new Error("Certificate browser fixtures were not created.");
  }

  const classRecord = await pool.query<{ id: string }>(
    `insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id, course_type, course_number)
     values ($1, $2, $3, 'classroom', 'finalized', $4, $5, 'continuing_education', 'CE-1') returning id`,
    [`E2E Certificate Course ${suffix}`, siteId, userId, suffix, agencyId],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId) {
    await pool.end();
    throw new Error("Certificate browser class was not created.");
  }
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours, position) values ($1, '2026-09-05T13:00:00Z', '2026-09-05T15:00:00Z', 2, 1)",
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

  const snapshot = {
    class: {
      courseName: `E2E Certificate Course ${suffix}`,
      siteName: `E2E Certificate Site ${suffix}`,
      objectives: null,
      courseType: "continuing_education",
      courseNumber: "CE-1",
      completedAt: "2026-09-05T14:00:00.000Z",
    },
    destinations: [{ code: "kbems", name: "KBEMS / KEMSIS" }],
    signature: {
      name: "E2E Cert Instructor",
      signedAt: "2026-09-05T15:00:00.000Z",
      attestationVersion: "roster-attestation-001",
    },
    instructors: [
      { name: "E2E Cert Instructor", isLead: true, ffn: null, level: null },
    ],
    components: [
      {
        title: null,
        startsAt: "2026-09-05T13:00:00.000Z",
        endsAt: "2026-09-05T15:00:00.000Z",
        creditedHours: "2",
      },
    ],
    attendance: [
      {
        attendanceId: "e2e-cert-a1",
        agencyName: `E2E Certificate Agency ${suffix}`,
        creditedHours: "2",
        firstName: "Ada",
        lastName: "Lovelace",
        guestFirstName: null,
        guestLastName: null,
        email: "ada.lovelace@example.com",
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
    throw new Error("Certificate browser revision was not created.");
  }
  await pool.query(
    "insert into finalization_reporting_statuses (revision_id, reporting_system_id, status) values ($1, $2, 'pending')",
    [revisionId, kbemsSystemId],
  );
  await pool.end();

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  const view = page.getByRole("link", {
    name: "View certificates",
  });
  await expect(view).toBeVisible();

  const response = await page.request.get(
    `/api/staff/completion-certificates/${revisionId}`,
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");

  // The review screen exposes per-participant delivery with a resend control
  // whose recipient field is revealed on demand.
  await expect(
    page.getByRole("heading", { name: "Certificate delivery" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resend" }).first().click();
  await expect(
    page.getByLabel(/email recipient for ada lovelace/i),
  ).toBeVisible();
});
