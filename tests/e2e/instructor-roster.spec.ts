import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const elevatedUsername = process.env.E2E_ELEVATED_STAFF_USERNAME;
const elevatedPassword = process.env.E2E_ELEVATED_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

// The full review-correct-finalize-reopen journey is heavy; under the parallel
// suite the dev server can take longer than the 30s default.
test.setTimeout(120_000);

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
]) {
  test(`${viewport.name} open review supports roster correction and finalization`, async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== "chromium",
      "Mutating roster coverage runs once on chromium.",
    );
    test.skip(
      !username || !password || !connectionString,
      "Set E2E staff credentials and E2E_DATABASE_URL.",
    );
    if (!username || !password || !connectionString) return;
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    const pool = new Pool({ connectionString, max: 1 });
    const suffix = randomUUID();
    const actor = await pool.query<{ id: string }>(
      "select id from users where username = $1",
      [username],
    );
    if (!actor.rows[0]) throw new Error("E2E staff user was not found.");
    const site = await pool.query<{ id: string }>(
      "insert into training_sites (name) values ($1) returning id",
      [`Roster Site ${suffix}`],
    );
    const agency = await pool.query<{ id: string }>(
      "insert into agencies (name) values ($1) returning id",
      [`Roster Agency ${suffix}`],
    );
    const classRecord = await pool.query<{ id: string }>(
      "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
      [
        `Roster Course ${suffix}`,
        site.rows[0]?.id,
        actor.rows[0].id,
        randomUUID(),
        agency.rows[0]?.id,
      ],
    );
    const classId = classRecord.rows[0]?.id;
    if (!classId || !agency.rows[0]?.id)
      throw new Error("Roster fixtures were not created.");
    await pool.query(
      "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
      [classId, actor.rows[0].id],
    );
    await pool.query(
      "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, $2, $3, 4)",
      [classId, "2026-09-10T13:00:00Z", "2026-09-10T17:00:00Z"],
    );
    // Attendance comes from a valid sign-in now; fixture it directly because
    // manual staff entry is retired.
    const guest = await pool.query<{ id: string }>(
      "insert into class_guests (class_id, first_name, last_name) values ($1, 'Tablet', 'Guest') returning id",
      [classId],
    );
    await pool.query(
      "insert into attendance (class_id, guest_id, agency_id, idempotency_key, payload_fingerprint, credited_hours) values ($1, $2, $3, $4, 'fixture', 4)",
      [classId, guest.rows[0]?.id, agency.rows[0].id, randomUUID()],
    );
    await pool.end();

    await signIn(page, username, password);
    await page.goto(`/staff/classes/${classId}`);
    await expect(page.getByText("Live class")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copy sign-in link" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Full-screen QR" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Review and finalize" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/staff/classes/${classId}/review$`),
    );
    await expect(page.getByText("Review and finalize")).toBeVisible();
    await page.getByLabel("Credit", { exact: true }).fill("3.5");
    await page.getByLabel("Adjustment reason").selectOption("Left Early");
    await page.getByRole("button", { name: "Update credit" }).click();
    await expect(page.getByText("Roster updated.")).toBeVisible();

    await page.getByRole("checkbox", { name: /I certify/i }).check();
    await page.getByLabel("Sign with your name").fill("Tablet Lead");
    await page
      .getByRole("button", { name: "Finalize and sign roster" })
      .click();
    // Regression: finalizing from the review route must render the finalized
    // review instead of a 404.
    await expect(page.getByText("Finalized class review")).toBeVisible();
    await expect(page.getByText("Roster finalized")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Update credit" }),
    ).toHaveCount(0);
    await expect
      .poll(async () => {
        const finalizedPool = new Pool({ connectionString, max: 1 });
        const result = await finalizedPool.query<{ status: string }>(
          "select status from classes where id = $1",
          [classId],
        );
        await finalizedPool.end();
        return result.rows[0]?.status;
      })
      .toBe("finalized");

    // Reopening from the review screen returns to the editable class detail.
    await page.getByLabel("Reopen note").fill("Corrected after review");
    await page.getByRole("button", { name: "Reopen for correction" }).click();
    await expect(page).toHaveURL(new RegExp(`/staff/classes/${classId}$`));
    await expect(page.getByText("Live class")).toBeVisible();
  });
}

test("elevated staff can open an unassigned class review", async ({ page }) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating roster coverage runs once on chromium.",
  );
  test.skip(
    !elevatedUsername || !elevatedPassword || !connectionString,
    "Set elevated E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!elevatedUsername || !elevatedPassword || !connectionString) return;
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = randomUUID();
  const elevated = await pool.query<{ id: string }>(
    "select u.id from users u join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id where u.username = $1 and r.code in ('administrator', 'training-major') and r.is_active = true limit 1",
    [elevatedUsername],
  );
  if (!elevated.rows[0])
    throw new Error("Elevated E2E user needs an active elevated role.");
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Elevated Review Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`Elevated Review Agency ${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
    [
      `Elevated Review Course ${suffix}`,
      site.rows[0]?.id,
      elevated.rows[0].id,
      randomUUID(),
      agency.rows[0]?.id,
    ],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId) throw new Error("Review fixture was not created.");
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, $2, $3, 4)",
    [classId, "2026-09-10T13:00:00Z", "2026-09-10T17:00:00Z"],
  );
  await pool.end();

  await signIn(page, elevatedUsername, elevatedPassword);
  await page.goto(`/staff/classes/${classId}/review`);
  await expect(page.getByText("Review and finalize")).toBeVisible();
});
