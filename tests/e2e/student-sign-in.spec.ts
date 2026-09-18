import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { e2eDatabaseUrl } from "./support/database";

const token = process.env.E2E_CLASS_SIGN_IN_TOKEN;
const publicCode = process.env.E2E_CLASS_PUBLIC_CODE;
const accessPin = process.env.E2E_CLASS_ACCESS_PIN;

const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePublicCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(
    bytes,
    (byte) => PUBLIC_CODE_ALPHABET[byte % PUBLIC_CODE_ALPHABET.length],
  ).join("");
}

test("regular student without agency memberships can complete sign-in", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating sign-in coverage runs once on chromium.",
  );
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
  const course = await pool.query<{ id: string }>(
    "insert into courses (name) values ($1) returning id",
    [`Sign-in Course ${suffix}`],
  );
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
    "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, public_code, host_agency_id, opened_at) values ($1, $2, $3, 'classroom', 'open', $4, $5, $6, now()) returning id",
    [
      course.rows[0]?.id,
      site.rows[0]?.id,
      owner.rows[0]?.id,
      crypto.randomUUID(),
      code,
      agency.rows[0]?.id,
    ],
  );
  const student = await pool.query<{ id: string }>(
    "insert into students (first_name, last_name, phone) values ('No', 'Membership', $1) returning id",
    [phone],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours, position) values ($1, now(), now() + interval '4 hours', 4, 0)",
    [classRecord.rows[0]?.id],
  );
  await pool.end();

  await page.goto(`/${code}`);
  await expect(page).toHaveURL(/\/sign-in$/);
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
