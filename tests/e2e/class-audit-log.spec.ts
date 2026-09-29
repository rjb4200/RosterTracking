import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("staff can view and download the class audit log", async ({ page }) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating audit coverage runs once on chromium.",
  );
  const connectionString = e2eDatabaseUrl();
  test.skip(
    !connectionString || !username || !password,
    "Set E2E credentials.",
  );
  if (!connectionString || !username || !password) return;

  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const actor = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [username],
  );
  if (!actor.rows[0]?.id) throw new Error("E2E staff user was not found.");
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`Audit Agency ${suffix}`],
  );
  const klass = await pool.query<{ id: string }>(
    "insert into classes (name, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id, opened_at) values ($1, $2, 'classroom', 'open', $3, $4, now()) returning id",
    [
      `Audit Course ${suffix}`,
      actor.rows[0].id,
      crypto.randomUUID(),
      agency.rows[0]?.id,
    ],
  );
  const classId = klass.rows[0]?.id;
  if (!classId) throw new Error("Audit class was not created.");
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
    [classId, actor.rows[0].id],
  );
  await pool.query(
    "insert into audit_logs (actor_user_id, actor_type, action, entity_type, entity_id, details) values ($1, 'user', 'class.created', 'class', $2, $3)",
    [
      actor.rows[0].id,
      classId,
      JSON.stringify({ name: `Audit Course ${suffix}` }),
    ],
  );
  await pool.end();

  await signIn(page, username, password);
  const inline = await page.request.get(
    `/api/staff/class-audit-log/${classId}?disposition=inline`,
  );
  expect(inline.status()).toBe(200);
  expect(inline.headers()["content-type"]).toContain("application/pdf");
  expect(inline.headers()["content-disposition"]).toContain("inline");

  const attachment = await page.request.get(
    `/api/staff/class-audit-log/${classId}`,
  );
  expect(attachment.status()).toBe(200);
  expect(attachment.headers()["content-disposition"]).toContain("attachment");
});

test("the class audit log is not available to anonymous visitors", async ({
  request,
}) => {
  const connectionString = e2eDatabaseUrl();
  test.skip(!connectionString, "Set E2E_DATABASE_URL.");
  if (!connectionString) return;
  const response = await request.get(
    `/api/staff/class-audit-log/${crypto.randomUUID()}`,
  );
  expect(response.status()).toBe(404);
});
