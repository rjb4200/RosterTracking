import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { Pool } from "pg";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const databaseUrl = e2eDatabaseUrl();

test("Reports generates and downloads the MTU Usage Summary PDF", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Database fixture runs once on chromium.",
  );
  test.skip(
    !username || !password || !databaseUrl,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !databaseUrl) return;
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const suffix = crypto.randomUUID();
  try {
    const user = await pool.query<{ id: string }>(
      "select id from users where username = $1",
      [username],
    );
    const site = await pool.query<{ id: string }>(
      "insert into training_sites (name) values ($1) returning id",
      [`E2E Reports Site ${suffix}`],
    );
    const agency = await pool.query<{ id: string }>(
      "insert into agencies (name) values ($1) returning id",
      [`E2E Reports Agency ${suffix}`],
    );
    const classRecord = await pool.query<{ id: string }>(
      `insert into classes (name, training_site_id, host_agency_id, created_by_user_id, delivery_method, status, sign_in_token_hash) values ($1, $2, $3, $4, 'classroom', 'open', $5) returning id`,
      [
        `E2E Reports Course ${suffix}`,
        site.rows[0]?.id,
        agency.rows[0]?.id,
        user.rows[0]?.id,
        suffix,
      ],
    );
    const classId = classRecord.rows[0]?.id;
    if (!classId) throw new Error("Reports fixture creation failed.");
    await pool.query(
      "insert into class_reporting_systems (class_id, reporting_system_id) select $1, id from reporting_systems where code = 'mtu'",
      [classId],
    );
    await pool.query(
      "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, '2026-01-15T13:00:00Z', '2026-01-15T17:00:00Z', 4)",
      [classId],
    );
    const guest = await pool.query<{ id: string }>(
      "insert into class_guests (class_id, first_name, last_name) values ($1, 'Report', 'Student') returning id",
      [classId],
    );
    await pool.query(
      "insert into attendance (class_id, guest_id, agency_id, credited_hours, idempotency_key, payload_fingerprint) values ($1, $2, $3, 4, $4, $4)",
      [classId, guest.rows[0]?.id, agency.rows[0]?.id, suffix],
    );

    await signIn(page, username, password);
    await page.goto("/staff/reports");
    await expect(
      page.getByRole("heading", { name: "Reports", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Reports", exact: true }),
    ).toHaveAttribute("href", "/staff/reports");
    const generate = page.getByRole("button", { name: "Download report PDF" });
    await expect(generate).toBeDisabled();
    await page.getByLabel("Time frame").selectOption("last-month");
    await expect(generate).toBeDisabled();
    await page.getByLabel("Time frame").selectOption("custom");
    await page.getByLabel("From", { exact: true }).fill("2026-01-01");
    await page.getByLabel("To", { exact: true }).fill("2026-01-31");
    await page
      .getByLabel("Report", { exact: true })
      .selectOption("mtu-usage-summary");
    const downloadPromise = page.waitForEvent("download");
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/staff/reports?"),
    );
    await generate.click();
    const download = await downloadPromise;
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("private, no-store");
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect(download.suggestedFilename()).toMatch(/mtu.*\.pdf$/i);
    expect(await download.failure()).toBeNull();
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);

    for (const query of [
      "report=unknown&from=2026-01-01&to=2026-01-31",
      "report=mtu-usage-summary",
      "report=mtu-usage-summary&from=2026-02-30&to=2026-03-01",
      "report=mtu-usage-summary&from=2026-02-01&to=2026-01-01",
    ]) {
      const invalid = await page.request.get(`/api/staff/reports?${query}`);
      expect(invalid.status()).toBe(400);
      expect(invalid.headers()["cache-control"]).toContain("private, no-store");
    }
    expect((await page.request.get("/staff/reporting")).status()).toBe(404);
  } finally {
    await pool.end();
  }
});

test("instructor-only staff cannot open Reports or generate a report", async ({
  page,
}) => {
  const instructor = process.env.E2E_INSTRUCTOR_USERNAME;
  const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD;
  test.skip(
    !instructor || !instructorPassword,
    "Set instructor E2E credentials.",
  );
  if (!instructor || !instructorPassword) return;
  await signIn(page, instructor, instructorPassword);
  await page.goto("/staff/reports");
  await expect(page).toHaveURL(/\/staff\/instructor$/);
  await expect(
    page.getByRole("link", { name: "Reports", exact: true }),
  ).toHaveCount(0);
  const response = await page.request.get(
    "/api/staff/reports?report=mtu-usage-summary&from=2026-01-01&to=2026-01-31",
  );
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("private, no-store");
});

test("anonymous report generation requires sign-in", async ({ request }) => {
  const response = await request.get(
    "/api/staff/reports?report=mtu-usage-summary&from=2026-01-01&to=2026-01-31",
  );
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("private, no-store");
});
