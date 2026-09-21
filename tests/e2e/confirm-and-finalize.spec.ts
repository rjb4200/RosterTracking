import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

function skipUnlessEnabled() {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating lifecycle coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
}

async function createOpenClass() {
  if (!connectionString) throw new Error("E2E_DATABASE_URL is required.");
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = crypto.randomUUID();
  const actor = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [username],
  );
  if (!actor.rows[0]) throw new Error("E2E staff user was not found.");
  const course = await pool.query<{ id: string }>(
    "insert into courses (name) values ($1) returning id",
    [`Confirm Course ${suffix}`],
  );
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Confirm Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`Confirm Agency ${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (course_id, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
    [
      course.rows[0]?.id,
      site.rows[0]?.id,
      actor.rows[0].id,
      crypto.randomUUID(),
      agency.rows[0]?.id,
    ],
  );
  const classId = classRecord.rows[0]?.id;
  if (!classId || !agency.rows[0]?.id)
    throw new Error("Confirm fixtures were not created.");
  await pool.query(
    "insert into class_instructors (class_id, user_id, is_lead) values ($1, $2, true)",
    [classId, actor.rows[0].id],
  );
  await pool.query(
    "insert into class_components (class_id, starts_at, ends_at, credited_hours) values ($1, $2, $3, 4)",
    [classId, "2026-09-10T13:00:00Z", "2026-09-10T17:00:00Z"],
  );
  await pool.end();
  return { classId, agencyId: agency.rows[0].id };
}

async function classStatus(classId: string) {
  if (!connectionString) throw new Error("E2E_DATABASE_URL is required.");
  const pool = new Pool({ connectionString, max: 1 });
  const result = await pool.query<{ status: string }>(
    "select status from classes where id = $1",
    [classId],
  );
  await pool.end();
  return result.rows[0]?.status;
}

test("finishing attendance lands on the review screen", async ({ page }) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass();

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);
  await page
    .getByRole("button", { name: "Finish attendance and review" })
    .click();

  await expect(page).toHaveURL(new RegExp(`/staff/classes/${classId}/review$`));
  await expect(page.getByText("Completed class review")).toBeVisible();
});

test("class command controls stay reachable on a narrow viewport", async ({
  page,
}) => {
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass();

  await signIn(page, username, password);
  // Same narrow-viewport reachability contract as the class wizard (issue #13):
  // the page must not overflow and the primary control must win its own hit
  // test. Read-only, so it runs on every browser project.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/staff/classes/${classId}`);

  const finish = page.getByRole("button", {
    name: "Finish attendance and review",
  });
  await finish.scrollIntoViewIfNeeded();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const reachable = await finish.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const topElement = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return Boolean(
      topElement && (topElement === button || button.contains(topElement)),
    );
  });
  expect(reachable).toBe(true);
});

test("cancelling a class keeps the operator on the class page", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass();

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);
  await page.getByPlaceholder("Cancellation reason").fill("Crew unavailable");
  await page.getByRole("button", { name: "Cancel class" }).click();

  await expect.poll(() => classStatus(classId)).toBe("cancelled");
  expect(page.url()).toContain(`/staff/classes/${classId}`);
  expect(page.url()).not.toContain("/review");
});

test("correct the roster on the review screen and finalize from it", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId, agencyId } = await createOpenClass();

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);

  const guestForm = page
    .getByRole("heading", { name: "Add class guest" })
    .locator("..");
  await guestForm.getByLabel("First name").fill("Confirmed");
  await guestForm.getByLabel("Last name").fill("Guest");
  await guestForm.getByLabel("Represented agency").selectOption(agencyId);
  await page.getByRole("button", { name: "Add guest attendance" }).click();
  await expect(page.getByText("Confirmed Guest")).toBeVisible();

  await page
    .getByRole("button", { name: "Finish attendance and review" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/staff/classes/${classId}/review$`));
  await expect(page.getByText("Completed class review")).toBeVisible();

  await page.getByLabel("Credit", { exact: true }).fill("3.5");
  await page.getByLabel("Adjustment reason").selectOption("Left Early");
  await page.getByRole("button", { name: "Update credit" }).click();
  await expect(page.getByText("Roster updated.")).toBeVisible();

  await page.getByRole("button", { name: "Finalize roster" }).click();
  await expect.poll(() => classStatus(classId)).toBe("finalized");
});
