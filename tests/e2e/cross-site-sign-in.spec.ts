import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { e2eDatabaseUrl } from "./support/database";

const CONTEXT_COOKIE = "roster_sign_in_context";
const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePublicCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(
    bytes,
    (byte) => PUBLIC_CODE_ALPHABET[byte % PUBLIC_CODE_ALPHABET.length],
  ).join("");
}

async function createOpenClassFixture(connectionString: string) {
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const publicCode = generatePublicCode();
  const course = await pool.query<{ id: string }>(
    "insert into courses (name) values ($1) returning id",
    [`Cross-site Course ${suffix}`],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Cross-site Site ${suffix}`],
  );
  const agencyName = `Cross-site Agency ${suffix}`;
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [agencyName],
  );
  const owner = await pool.query<{ id: string }>(
    "insert into users (username, display_name, password_hash) values ($1, 'Cross-site Owner', 'fixture') returning id",
    [`cross-site-owner-${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, public_code, host_agency_id, opened_at) values ($1, $2, $3, 'classroom', 'open', $4, $5, $6, now()) returning id",
    [
      course.rows[0]?.id,
      site.rows[0]?.id,
      owner.rows[0]?.id,
      crypto.randomUUID(),
      publicCode,
      agency.rows[0]?.id,
    ],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours, position) values ($1, now(), now() + interval '4 hours', 4, 0)",
    [classRecord.rows[0]?.id],
  );
  const phone = `+1859${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;
  await pool.query(
    "insert into students (first_name, last_name, phone) values ('Cross-site', $1, $2)",
    [`Student ${suffix}`, phone],
  );
  await pool.end();
  return { publicCode, phone, agencyName };
}

test("a cross-site arrival still receives a usable sign-in context", async ({
  page,
  context,
  baseURL,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString || !baseURL) return;

  const fixture = await createOpenClassFixture(connectionString);

  // Arrive from an external page as a student following a shared link would.
  await page.route("https://example.com/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><body></body></html>",
    }),
  );
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  await page.evaluate((href) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = "class";
    document.body.appendChild(anchor);
    anchor.click();
  }, new URL(`/${fixture.publicCode}`, baseURL).toString());

  await expect(page).toHaveURL(/\/sign-in$/);

  // The context must be established on the first-party page response.
  const contextCookie = (await context.cookies()).find(
    (cookie) => cookie.name === CONTEXT_COOKIE,
  );
  expect(contextCookie, "sign-in context cookie").toBeTruthy();
  expect(contextCookie?.value.length ?? 0).toBeGreaterThan(0);

  // The phone step requires that context, so reaching it proves the fix.
  await page.getByLabel("Current phone number").fill(fixture.phone);
  await page.getByRole("button", { name: "Continue" }).click();

  // A known phone is recognised, and the student completes sign-in. This is the
  // main pathway that a cross-site arrival previously could not reach at all.
  await expect(page.getByText("Is this you?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, continue" }).click();
  await page
    .getByLabel("Agency represented today")
    .selectOption({ label: fixture.agencyName });
  await page.getByRole("button", { name: "Review sign-in" }).click();
  await page.getByRole("button", { name: "Confirm & Sign In" }).click();
  await expect(
    page.getByRole("heading", { name: "You're signed in" }),
  ).toBeVisible();
});

test("the entry redirect does not issue a usable sign-in context", async ({
  request,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;

  const fixture = await createOpenClassFixture(connectionString);
  const response = await request.get(`/${fixture.publicCode}`, {
    maxRedirects: 0,
    failOnStatusCode: false,
  });

  const setCookie = response.headers()["set-cookie"] ?? "";
  expect(setCookie).not.toContain(`${CONTEXT_COOKIE}=`);
  // The entry redirect must lead to the first-party context route.
  expect(response.headers().location ?? "").toContain("/sign-in/establish");
});
