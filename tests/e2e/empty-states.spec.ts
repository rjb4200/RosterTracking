import { randomUUID } from "node:crypto";

import { hash } from "@node-rs/argon2";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const databaseUrl = e2eDatabaseUrl();

test("empty public directory orients visitors", async ({ page }) => {
  test.skip(!databaseUrl, "Set E2E_DATABASE_URL.");
  if (!databaseUrl) return;

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from classes existing
       where existing.status = 'open'
         and exists (
           select 1 from class_components component
           where component.class_id = existing.id
             and component.starts_at
               between now() - interval '36 hours' and now() + interval '18 hours'
         )`,
    );
    test.skip(
      rows[0]?.count !== "0",
      "An open class is inside the public directory window.",
    );
    if (rows[0]?.count !== "0") return;
  } finally {
    await pool.end();
  }

  await page.goto("/");
  await expect(page.getByText("No classes are open")).toBeVisible();
  await expect(
    page.getByText(/classes appear here when an instructor opens them/i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /student sign-in/i }),
  ).toHaveCount(0);
});

test("staff search with no matches offers to clear the search", async ({
  page,
}) => {
  test.skip(
    !username || !password || !databaseUrl,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password) return;

  const term = `no-match-${randomUUID()}`;
  await signIn(page, username, password);
  await page.goto(`/staff/students?q=${encodeURIComponent(term)}`);
  await expect(page.getByText(`No students match "${term}"`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear search" })).toBeVisible();
});

test("an empty staff list offers the create action", async ({ page }) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating empty-state coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !databaseUrl,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !databaseUrl) return;

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const { rows } = await pool.query<{ count: string }>(
      "select count(*)::text as count from students",
    );
    test.skip(rows[0]?.count !== "0", "The student catalog is not empty.");
    if (rows[0]?.count !== "0") return;
  } finally {
    await pool.end();
  }

  await signIn(page, username, password);
  await page.goto("/staff/students");
  await expect(page.getByText("No students yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "New student" })).toBeVisible();
});

test("instructor today section names the next upcoming class", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating empty-state coverage runs once on chromium.",
  );
  test.skip(!databaseUrl, "Set E2E_DATABASE_URL.");
  if (!databaseUrl) return;

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const instructorPassword = "empty-state-fixture-password";
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const courseName = `E2E Empty State ${suffix}`;
  const instructorUsername = `e2e-empty-${suffix}`;
  let classId: string | undefined;
  let siteId: string | undefined;
  let agencyId: string | undefined;

  try {
    const passwordHash = await hash(instructorPassword);
    const user = await pool.query<{ id: string }>(
      `insert into users (username, display_name, password_hash)
       values ($1, 'E2E Empty State', $2) returning id`,
      [instructorUsername, passwordHash],
    );
    const userId = user.rows[0]?.id;
    if (!userId) throw new Error("Instructor fixture user was not created.");
    await pool.query(
      `insert into user_roles (user_id, role_id)
       select $1, id from roles where code = 'instructor'`,
      [userId],
    );
    const site = await pool.query<{ id: string }>(
      "insert into training_sites (name) values ($1) returning id",
      [`E2E Empty State Site ${suffix}`],
    );
    siteId = site.rows[0]?.id;
    const agency = await pool.query<{ id: string }>(
      "insert into agencies (name) values ($1) returning id",
      [`E2E Empty State Agency ${suffix}`],
    );
    agencyId = agency.rows[0]?.id;
    if (!siteId || !agencyId) {
      throw new Error("Instructor fixture prerequisites failed.");
    }
    const record = await pool.query<{ id: string }>(
      `insert into classes
         (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id)
       values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id`,
      [courseName, siteId, userId, randomUUID(), agencyId],
    );
    classId = record.rows[0]?.id;
    if (!classId) throw new Error("Instructor fixture class was not created.");
    await pool.query(
      "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
      [classId, userId],
    );
    await pool.query(
      `insert into class_components (class_id, starts_at, ends_at, credited_hours, position)
       values ($1, now() + interval '1 day', now() + interval '1 day' + interval '4 hours', 4, 0)`,
      [classId],
    );

    await signIn(page, instructorUsername, instructorPassword);
    await page.goto("/staff/instructor");
    await expect(page.getByText("No classes today")).toBeVisible();
    await expect(
      page.getByText(`Your next class is ${courseName}`),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: courseName })).toBeVisible();
  } finally {
    if (classId) {
      await pool.query("delete from class_components where class_id = $1", [
        classId,
      ]);
      await pool.query("delete from class_instructors where class_id = $1", [
        classId,
      ]);
      await pool.query("delete from classes where id = $1", [classId]);
    }
    if (siteId) {
      await pool.query("delete from training_sites where id = $1", [siteId]);
    }
    if (agencyId) {
      await pool.query("delete from agencies where id = $1", [agencyId]);
    }
    await pool.end();
  }
});
