import { createHash, randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFRawStream,
} from "pdf-lib";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

test.setTimeout(180_000);

function randomPhone() {
  return `+1859${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;
}

function pageStrings(pdf: PDFDocument): string[] {
  const strings: string[] = [];
  for (const page of pdf.getPages()) {
    const contents = page.node.Contents();
    if (!contents) continue;
    const streams =
      contents instanceof PDFArray
        ? Array.from({ length: contents.size() }, (_, index) =>
            contents.get(index),
          )
        : [contents];
    for (const reference of streams) {
      const stream = pdf.context.lookup(reference);
      const decoded =
        stream instanceof PDFRawStream
          ? decodePDFRawStream(stream).decode()
          : (stream as { getContents?: () => Uint8Array }).getContents?.();
      if (decoded) strings.push(Buffer.from(decoded).toString("latin1"));
    }
  }
  return strings;
}

async function decodedPdfText(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes);
  return {
    pageCount: pdf.getPageCount(),
    text: pageStrings(pdf)
      .join("\n")
      .replace(/<([0-9A-Fa-f]+)>\s*Tj/g, (_, hex: string) =>
        Buffer.from(hex, "hex").toString("latin1"),
      ),
  };
}

async function createInitialClass(pool: Pool, prefix: string) {
  if (!username) throw new Error("E2E staff username is required.");
  const suffix = randomUUID();
  const rawToken = `${randomUUID()}${randomUUID()}`;
  const actor = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [username],
  );
  const actorId = actor.rows[0]?.id;
  if (!actorId) throw new Error("E2E staff user was not found.");
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`${prefix} Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string; name: string }>(
    "insert into agencies (name) values ($1) returning id, name",
    [`${prefix} Agency ${suffix}`],
  );
  const agencyId = agency.rows[0]?.id;
  const agencyName = agency.rows[0]?.name;
  if (!agencyId || !agencyName) {
    throw new Error("E2E agency was not created.");
  }
  const klass = await pool.query<{ id: string }>(
    `insert into classes (
       name, training_site_id, created_by_user_id, delivery_method,
       course_type, status, sign_in_token_hash, host_agency_id, opened_at
     ) values ($1, $2, $3, 'classroom', 'initial_certification', 'open', $4, $5, now())
     returning id`,
    [
      `${prefix} Course ${suffix}`,
      site.rows[0]?.id,
      actorId,
      createHash("sha256").update(rawToken).digest("hex"),
      agencyId,
    ],
  );
  const classId = klass.rows[0]?.id;
  if (!classId) throw new Error("E2E class was not created.");
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
    [classId, actorId],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours, position) values ($1, now(), now() + interval '4 hours', 4, 0)",
    [classId],
  );
  return { classId, agencyId, agencyName, rawToken, suffix };
}

async function createStudent(pool: Pool, firstName: string, lastName: string) {
  const student = await pool.query<{ id: string }>(
    "insert into students (first_name, last_name, phone, email) values ($1, $2, $3, $4) returning id",
    [
      firstName,
      lastName,
      randomPhone(),
      `${firstName}.${lastName}.${randomUUID()}@example.com`.toLowerCase(),
    ],
  );
  const id = student.rows[0]?.id;
  if (!id) throw new Error("E2E student was not created.");
  return id;
}

async function signInStudent(
  page: Page,
  rawToken: string,
  phone: string,
  agencyName: string,
) {
  await page.context().clearCookies();
  await page.goto(`/sign-in/${rawToken}`);
  await page.getByLabel("Current phone number").fill(phone);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Is this you?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await page
    .getByLabel("Agency represented today")
    .selectOption({ label: agencyName });
  await page.getByRole("button", { name: "Review sign-in" }).click();
  await page.getByRole("button", { name: "Confirm & Sign In" }).click();
  await expect(
    page.getByRole("heading", { name: "You're signed in" }),
  ).toBeVisible();
}

test("daily check-ins block finalization until a missing day has a disposition", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating check-in coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const fixture = await createInitialClass(pool, "Daily");
    const full = await createStudent(pool, "Full", "Attendance");
    const missing = await createStudent(pool, "Missing", "Day");
    const fullPhone = (
      await pool.query<{ phone: string }>(
        "select phone from students where id = $1",
        [full],
      )
    ).rows[0]?.phone;
    const missingPhone = (
      await pool.query<{ phone: string }>(
        "select phone from students where id = $1",
        [missing],
      )
    ).rows[0]?.phone;
    if (!fullPhone || !missingPhone) {
      throw new Error("E2E student phones were not created.");
    }

    await signInStudent(page, fixture.rawToken, fullPhone, fixture.agencyName);
    await signInStudent(page, fixture.rawToken, fullPhone, fixture.agencyName);
    await expect(
      page.getByText(
        "Your attendance was already recorded. No duplicate was created.",
      ),
    ).toBeVisible();
    await signInStudent(
      page,
      fixture.rawToken,
      missingPhone,
      fixture.agencyName,
    );

    const checkIns = await pool.query<{ count: number }>(
      "select count(*)::int as count from attendance_check_ins where attendance_id in (select id from attendance where class_id = $1)",
      [fixture.classId],
    );
    expect(checkIns.rows[0]?.count).toBe(2);

    // A later class day exists through the full attendee's second check-in.
    // The missing attendee therefore needs a disposition before finalization.
    const laterDate = await pool.query<{ check_in_date: string }>(
      `insert into attendance_check_ins (
         attendance_id, check_in_date, checked_in_at, rendered_text, text_version,
         sign_in_method, originating_ip, request_source_fingerprint,
         request_correlation_id
       )
       select a.id, ci.check_in_date + 1, now(), 'I confirm I attended this class day.', 1,
         'current_phone', '203.0.113.10', 'e2e-source', 'e2e-correlation'
       from attendance a
       join attendance_check_ins ci on ci.attendance_id = a.id
       where a.class_id = $1 and a.student_id = $2
       returning to_char(check_in_date, 'YYYY-MM-DD') as check_in_date`,
      [fixture.classId, full],
    );
    const missingDate = laterDate.rows[0]?.check_in_date;
    if (!missingDate) throw new Error("Later check-in was not created.");

    await signIn(page, username, password);
    await page.goto(`/staff/classes/${fixture.classId}/review`);
    await expect(
      page.getByRole("heading", { name: "Certificate dispositions" }),
    ).toBeVisible();
    await expect(
      page.getByText(`Missing Day is missing 1 class day (${missingDate})`),
    ).toBeVisible();
    const finalize = page.getByRole("button", { name: "Finalize roster" });
    await expect(finalize).toBeDisabled();

    await page.getByLabel("Include certificate").check();
    await page.getByLabel("Inclusion note").fill("Made up the missed day");
    await page.getByRole("button", { name: "Save disposition" }).click();
    await expect(
      page.getByText("Certificate disposition saved."),
    ).toBeVisible();
    await page.reload();
    await expect(finalize).toBeEnabled();

    await page.getByRole("checkbox", { name: /I certify/i }).check();
    await page.getByLabel("Signature").fill("E2E Lead");
    await finalize.click();
    await expect
      .poll(
        async () => {
          const result = await pool.query<{ status: string }>(
            "select status from classes where id = $1",
            [fixture.classId],
          );
          return result.rows[0]?.status;
        },
        { timeout: 30_000 },
      )
      .toBe("finalized");

    const response = await page.request.get(
      `/api/staff/class-sign-in-record/${fixture.classId}`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    const pdf = await decodedPdfText(await response.body());
    expect(pdf.text).toContain("Full Attendance");
    expect(pdf.text).toContain("Missing Day");
  } finally {
    await pool.end();
  }
});

test("a crowded date continues the sign-in record across PDF pages", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating check-in coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const fixture = await createInitialClass(pool, "Paged");
    const count = 40;
    const names = Array.from(
      { length: count },
      (_, index) => `Bulk Participant ${index + 1}`,
    );
    for (const [index, name] of names.entries()) {
      const [firstName, ...rest] = name.split(" ");
      await pool.query(
        "insert into students (first_name, last_name, phone, email) values ($1, $2, $3, $4)",
        [
          firstName,
          rest.join(" "),
          randomPhone(),
          `bulk-${fixture.suffix}-${index}@example.com`,
        ],
      );
    }
    const students = await pool.query<{ id: string }>(
      "select id from students where email like $1 order by last_name",
      [`bulk-${fixture.suffix}-%`],
    );
    for (const [index, student] of students.rows.entries()) {
      const attendance = await pool.query<{ id: string }>(
        "insert into attendance (class_id, student_id, agency_id, idempotency_key, payload_fingerprint, credited_hours) values ($1, $2, $3, $4, 'fixture', 4) returning id",
        [
          fixture.classId,
          student.id,
          fixture.agencyId,
          `${fixture.suffix}-${index}`,
        ],
      );
      const attendanceId = attendance.rows[0]?.id;
      if (!attendanceId) throw new Error("E2E attendance was not created.");
      await pool.query(
        `insert into attendance_check_ins (
           attendance_id, check_in_date, checked_in_at, rendered_text, text_version,
           sign_in_method, originating_ip, request_source_fingerprint,
           request_correlation_id
         ) values ($1, current_date, now() + ($2 || ' seconds')::interval, $3, 1,
           'current_phone', '203.0.113.10', 'e2e-source', 'e2e-correlation')`,
        [attendanceId, index, `I confirm I attended as ${names[index]}.`],
      );
    }

    await signIn(page, username, password);
    const response = await page.request.get(
      `/api/staff/class-sign-in-record/${fixture.classId}`,
    );
    expect(response.status()).toBe(200);
    const pdf = await decodedPdfText(await response.body());
    expect(pdf.pageCount).toBeGreaterThan(1);
    for (const name of names) expect(pdf.text).toContain(name);
  } finally {
    await pool.end();
  }
});
