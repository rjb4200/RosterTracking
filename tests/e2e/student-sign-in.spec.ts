import { createHash } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";

import { encryptClassAccessPin } from "../../src/modules/classes/token";
import { e2eDatabaseUrl } from "./support/database";

const token = process.env.E2E_CLASS_SIGN_IN_TOKEN;
const publicCode = process.env.E2E_CLASS_PUBLIC_CODE;
const accessPin = process.env.E2E_CLASS_ACCESS_PIN;

const REMEMBERED_COOKIE = "roster_remembered_student";
const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePublicCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(
    bytes,
    (byte) => PUBLIC_CODE_ALPHABET[byte % PUBLIC_CODE_ALPHABET.length],
  ).join("");
}

// The public sign-in FFN field requires the canonical `0000-0000` form.
function randomFfn(): string {
  const block = () => String(Math.floor(Math.random() * 9000) + 1000);
  return `${block()}-${block()}`;
}

async function createRememberedFixture(
  connectionString: string,
  options: { requireFfn?: boolean; pin?: string } = {},
) {
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const phone = `+1859${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;
  const code = generatePublicCode();
  const firstName = "Remembered";
  const lastName = `Student ${suffix.slice(0, 8)}`;
  const agencyName = `Remembered Agency ${suffix}`;
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  const classToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;

  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Remembered Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [agencyName],
  );
  const owner = await pool.query<{ id: string }>(
    "insert into users (username, display_name, password_hash) values ($1, 'Remembered Owner', 'fixture') returning id",
    [`remembered-owner-${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, public_code, host_agency_id, opened_at) values ($1, $2, $3, 'classroom', 'open', $4, $5, $6, now()) returning id",
    [
      `Remembered Course ${suffix}`,
      site.rows[0]?.id,
      owner.rows[0]?.id,
      createHash("sha256").update(classToken).digest("hex"),
      code,
      agency.rows[0]?.id,
    ],
  );
  const student = await pool.query<{ id: string }>(
    "insert into students (first_name, last_name, phone, email) values ($1, $2, $3, $4) returning id",
    [firstName, lastName, phone, `remembered-${suffix}@example.com`],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours, position) values ($1, now(), now() + interval '4 hours', 4, 0)",
    [classRecord.rows[0]?.id],
  );
  await pool.query(
    "insert into remembered_devices (student_id, token_hash, expires_at, created_at) values ($1, $2, now() + interval '30 days', now() - interval '5 minutes')",
    [student.rows[0]?.id, tokenHash],
  );
  if (options.pin) {
    await pool.query(
      "update classes set access_pin_enabled = true, access_pin_encrypted = $2 where id = $1",
      [classRecord.rows[0]?.id, encryptClassAccessPin(options.pin)],
    );
  }
  if (options.requireFfn) {
    const system = await pool.query<{ id: string }>(
      "select rs.id from reporting_systems rs join reporting_requirement_sets rrs on rrs.reporting_system_id = rs.id and rrs.is_active = true where rs.is_active = true and rs.code = 'fire' limit 1",
    );
    await pool.query(
      "insert into class_reporting_systems (class_id, reporting_system_id) values ($1, $2)",
      [classRecord.rows[0]?.id, system.rows[0]?.id],
    );
  }
  await pool.end();
  return {
    code,
    firstName,
    lastName,
    agencyName,
    classId: classRecord.rows[0]?.id,
    studentId: student.rows[0]?.id,
    token,
    classToken,
    phone,
  };
}

async function addRememberedCookie(page: Page, value: string) {
  await page
    .context()
    .addCookies([
      { name: REMEMBERED_COOKIE, value, domain: "localhost", path: "/" },
    ]);
}

test("regular student without agency memberships can complete sign-in", async ({
  page,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;

  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const phone = `+1859${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;
  const code = generatePublicCode();
  const agencyName = `Sign-in Agency ${suffix}`;
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Sign-in Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [agencyName],
  );
  const owner = await pool.query<{ id: string }>(
    "insert into users (username, display_name, password_hash) values ($1, 'Sign-in Owner', 'fixture') returning id",
    [`signin-owner-${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, public_code, host_agency_id, opened_at) values ($1, $2, $3, 'classroom', 'open', $4, $5, $6, now()) returning id",
    [
      `Sign-in Course ${suffix}`,
      site.rows[0]?.id,
      owner.rows[0]?.id,
      crypto.randomUUID(),
      code,
      agency.rows[0]?.id,
    ],
  );
  const student = await pool.query<{ id: string }>(
    "insert into students (first_name, last_name, phone, email) values ('No', 'Membership', $1, $2) returning id",
    [phone, `no-membership-${crypto.randomUUID().slice(0, 8)}@example.com`],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours, position) values ($1, now(), now() + interval '4 hours', 4, 0)",
    [classRecord.rows[0]?.id],
  );
  await pool.end();

  const backgroundEntries: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (/^\/[A-Z2-9]{4}(\.rsc)?$/.test(path) || path === "/sign-in/establish") {
      backgroundEntries.push(path);
    }
  });
  await page.goto("/");
  // Give production Link prefetching a chance to run before choosing a class.
  await page.waitForTimeout(1500);
  expect(backgroundEntries).toEqual([]);
  await page
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", { name: `Sign-in Course ${suffix}` }),
    })
    .getByRole("link", { name: "Student sign-in" })
    .click();
  await expect(page).toHaveURL(/\/sign-in$/);
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "roster_sign_in_context",
  );
  expect(session).toBeDefined();
  const payload = JSON.parse(
    Buffer.from(session?.value.split(".")[0] ?? "", "base64url").toString(),
  );
  expect(payload.classId).toBe(classRecord.rows[0]?.id);
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

  const verify = new Pool({ connectionString, max: 1 });
  const attendance = await verify.query<{ count: number }>(
    "select count(*)::int as count from attendance where class_id = $1 and student_id = $2 and removed_at is null",
    [classRecord.rows[0]?.id, student.rows[0]?.id],
  );
  await verify.end();
  expect(attendance.rows[0]?.count).toBe(1);
});

test("remembered device confirms attendance in one action", async ({
  page,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;

  const fixture = await createRememberedFixture(connectionString);
  await addRememberedCookie(page, fixture.token);
  await page.goto(`/${fixture.code}`);
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByText("Is this you?")).toBeVisible();
  await expect(
    page.getByText(`${fixture.firstName} ${fixture.lastName}`, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm & Sign In" }).click();
  await expect(
    page.getByRole("heading", { name: "You're signed in" }),
  ).toBeVisible();

  const verify = new Pool({ connectionString, max: 1 });
  const attendance = await verify.query<{ count: number }>(
    "select count(*)::int as count from attendance where class_id = $1 and student_id = $2 and removed_at is null",
    [fixture.classId, fixture.studentId],
  );
  await verify.end();
  expect(attendance.rows[0]?.count).toBe(1);
});

test("not me revokes the remembered device and returns to phone entry", async ({
  page,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;

  const fixture = await createRememberedFixture(connectionString);
  await addRememberedCookie(page, fixture.token);
  await page.goto(`/${fixture.code}`);
  await expect(page.getByText("Is this you?")).toBeVisible();
  await page.getByRole("button", { name: "Not me" }).click();
  await expect(page.getByLabel("Current phone number")).toBeVisible();

  const verify = new Pool({ connectionString, max: 1 });
  const revoked = await verify.query<{ count: number }>(
    "select count(*)::int as count from remembered_devices where student_id = $1 and revoked_at is not null",
    [fixture.studentId],
  );
  await verify.end();
  expect(revoked.rows[0]?.count).toBe(1);
});

test("update my information collects a missing credential before confirmation", async ({
  page,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;

  const fixture = await createRememberedFixture(connectionString, {
    requireFfn: true,
  });
  await addRememberedCookie(page, fixture.token);
  await page.goto(`/${fixture.code}`);
  await expect(page.getByText("Is this you?")).toBeVisible();
  await expect(page.getByText("Update my information")).toBeVisible();
  const ffn = randomFfn();
  await page.getByLabel("FFN").fill(ffn);
  await page.getByRole("button", { name: "Confirm & Sign In" }).click();
  await expect(
    page.getByRole("heading", { name: "You're signed in" }),
  ).toBeVisible();

  const verify = new Pool({ connectionString, max: 1 });
  const credential = await verify.query<{ count: number }>(
    "select count(*)::int as count from student_credentials where student_id = $1",
    [fixture.studentId],
  );
  await verify.end();
  expect(credential.rows[0]?.count).toBe(1);
});

test("guest completes attendance without creating a remembered student", async ({
  page,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;
  const fixture = await createRememberedFixture(connectionString);
  await page.goto(`/${fixture.code}`);
  await page.getByRole("link", { name: "Sign in as a guest" }).click();
  await page.getByLabel("First name").fill("Guest");
  await page.getByLabel("Last name").fill("Attendee");
  await page.getByLabel("Email address").fill("guest.attendee@example.com");
  await page
    .getByLabel("Agency represented today")
    .selectOption({ label: fixture.agencyName });
  await page.getByRole("button", { name: "Review guest sign-in" }).click();
  await page.getByRole("button", { name: "Confirm & Sign In" }).click();
  await expect(
    page.getByRole("heading", { name: "You're signed in" }),
  ).toBeVisible();
  expect(
    (await page.context().cookies()).some(
      (cookie) => cookie.name === REMEMBERED_COOKIE,
    ),
  ).toBe(false);
  const verify = new Pool({ connectionString, max: 1 });
  try {
    const result = await verify.query<{ count: number }>(
      "select count(*)::int as count from attendance where class_id = $1 and guest_id is not null and student_id is null",
      [fixture.classId],
    );
    expect(result.rows[0]?.count).toBe(1);
  } finally {
    await verify.end();
  }
});

test("an unknown phone registers a new student and signs in", async ({
  page,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;
  const fixture = await createRememberedFixture(connectionString, {
    requireFfn: true,
  });
  const phone = `+1859${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;
  const ffn = randomFfn();

  await page.goto(`/${fixture.code}`);
  await page.getByLabel("Current phone number").fill(phone);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(
    page.getByRole("button", { name: "Create account & continue" }),
  ).toBeVisible();
  await page.getByLabel("First name").fill("Brand");
  await page.getByLabel("Last name").fill("New");
  await page.getByLabel("Email address").fill("brand.new@example.com");
  await page.getByLabel("FFN").fill(ffn);
  await page
    .getByLabel("Agency represented today")
    .selectOption({ label: fixture.agencyName });
  await page.getByRole("button", { name: "Create account & continue" }).click();
  await page.getByRole("button", { name: "Confirm & Sign In" }).click();
  await expect(
    page.getByRole("heading", { name: "You're signed in" }),
  ).toBeVisible();

  const verify = new Pool({ connectionString, max: 1 });
  try {
    const student = await verify.query<{ id: string; email: string | null }>(
      "select id, email from students where phone = $1",
      [phone],
    );
    expect(student.rows[0]?.email).toBe("brand.new@example.com");
    const attendance = await verify.query<{ count: number }>(
      "select count(*)::int as count from attendance where class_id = $1 and student_id = $2 and removed_at is null",
      [fixture.classId, student.rows[0]?.id],
    );
    expect(attendance.rows[0]?.count).toBe(1);
  } finally {
    await verify.end();
  }
});

test("PIN-protected class grants a usable session only after the correct PIN", async ({
  page,
  request,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;
  const fixture = await createRememberedFixture(connectionString, {
    pin: "4826",
  });
  for (const query of [
    `class=${fixture.code}`,
    `token=${fixture.classToken}`,
  ]) {
    const response = await request.get(`/sign-in/establish?${query}`, {
      maxRedirects: 0,
    });
    expect(response.headers().location).toContain("status=unavailable");
    expect(response.headers()["set-cookie"] ?? "").not.toContain(
      "roster_sign_in_context=",
    );
  }
  await page.goto(`/${fixture.code}`);
  await expect(
    page.getByRole("heading", { name: "Enter class PIN" }),
  ).toBeVisible();
  await page.getByLabel("Class PIN").fill("4826");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Current phone number").fill(fixture.phone);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await page.getByRole("button", { name: "Review sign-in" }).click();
  await page.getByRole("button", { name: "Confirm & Sign In" }).click();
  await expect(
    page.getByRole("heading", { name: "You're signed in" }),
  ).toBeVisible();
});

test("public class links require the configured numeric PIN", async ({
  page,
}) => {
  test.skip(
    !publicCode || !accessPin,
    "Set E2E_CLASS_PUBLIC_CODE and E2E_CLASS_ACCESS_PIN for a PIN-protected open class.",
  );
  if (!publicCode || !accessPin) return;

  await page.goto(`/${publicCode}`);
  await expect(
    page.getByRole("heading", { name: "Enter class PIN" }),
  ).toBeVisible();
  await page.getByLabel("Class PIN").fill("0000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Class PIN").fill(accessPin);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("valid class access removes the raw token and shows mobile sign-in", async ({
  page,
}) => {
  test.skip(!token, "Set E2E_CLASS_SIGN_IN_TOKEN for an open class.");
  if (!token) return;

  await page.goto(`/sign-in/${token}`);
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Class sign-in" }),
  ).toBeVisible();
  await expect(page.getByLabel("Current phone number")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCSS(
    "min-height",
    "50px",
  );
});

test("unknown phone offers recovery and guest without candidate details", async ({
  page,
}) => {
  test.skip(!token, "Set E2E_CLASS_SIGN_IN_TOKEN for an open class.");
  if (!token) return;

  await page.goto(`/sign-in/${token}`);
  await page.getByLabel("Current phone number").fill("859-555-0199");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("link", { name: "My phone number changed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in as a guest" }),
  ).toBeVisible();
  await expect(page.getByRole("list")).toHaveCount(0);
});

test("configured regular student reaches named profile confirmation", async ({
  page,
}) => {
  const phone = process.env.E2E_STUDENT_PHONE;
  test.skip(
    !token || !phone,
    "Set E2E_CLASS_SIGN_IN_TOKEN and E2E_STUDENT_PHONE.",
  );
  if (!token || !phone) return;

  await page.goto(`/sign-in/${token}`);
  await page.getByLabel("Current phone number").fill(phone);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Is this you?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Not me" })).toBeVisible();
});

test("guest entry never offers remembered-device access", async ({ page }) => {
  test.skip(!token, "Set E2E_CLASS_SIGN_IN_TOKEN for an open class.");
  if (!token) return;

  await page.goto(`/sign-in/${token}`);
  await page.getByRole("link", { name: "Sign in as a guest" }).click();
  await expect(page.getByLabel("First name")).toBeVisible();
  await expect(page.getByLabel("Last name")).toBeVisible();
  await expect(page.getByLabel("Remember me on this device")).toHaveCount(0);
});
