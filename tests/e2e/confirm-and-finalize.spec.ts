import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const instructorUsername = process.env.E2E_INSTRUCTOR_USERNAME;
const connectionString = e2eDatabaseUrl();

// The correct-and-finalize journey is heavy; under the parallel suite the dev
// server can take longer than the 30s default.
test.setTimeout(120_000);

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

async function createOpenClass(options: { attendance?: boolean } = {}) {
  if (!connectionString) throw new Error("E2E_DATABASE_URL is required.");
  const pool = new Pool({ connectionString, max: 1 });
  const suffix = randomUUID();
  const actor = await pool.query<{ id: string }>(
    "select id from users where username = $1",
    [username],
  );
  if (!actor.rows[0]) throw new Error("E2E staff user was not found.");
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Confirm Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`Confirm Agency ${suffix}`],
  );
  const classRecord = await pool.query<{ id: string }>(
    "insert into classes (name, training_site_id, created_by_user_id, delivery_method, status, sign_in_token_hash, host_agency_id) values ($1, $2, $3, 'classroom', 'open', $4, $5) returning id",
    [
      `Confirm Course ${suffix}`,
      site.rows[0]?.id,
      actor.rows[0].id,
      randomUUID(),
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
  if (options.attendance) {
    // Attendance now comes from a valid sign-in; fixture it directly because
    // manual staff entry is retired.
    const guest = await pool.query<{ id: string }>(
      "insert into class_guests (class_id, first_name, last_name) values ($1, 'Confirmed', 'Guest') returning id",
      [classId],
    );
    await pool.query(
      "insert into attendance (class_id, guest_id, agency_id, idempotency_key, payload_fingerprint, credited_hours) values ($1, $2, $3, $4, 'fixture', 4)",
      [classId, guest.rows[0]?.id, agency.rows[0].id, randomUUID()],
    );
  }
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

async function addReportingSystem(classId: string, code: string) {
  if (!connectionString) throw new Error("E2E_DATABASE_URL is required.");
  const pool = new Pool({ connectionString, max: 1 });
  await pool.query(
    "insert into class_reporting_systems (class_id, reporting_system_id) select $1, id from reporting_systems where code = $2",
    [classId, code],
  );
  await pool.end();
}

test("the open class primary action opens the review screen", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass();

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);
  await page.getByRole("link", { name: "Review and finalize" }).click();

  await expect(page).toHaveURL(new RegExp(`/staff/classes/${classId}/review$`));
  await expect(page.getByText("Post-class review")).toBeVisible();
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

  const finish = page.getByRole("link", { name: "Review and finalize" });
  await finish.scrollIntoViewIfNeeded();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const reachable = await finish.evaluate((control) => {
    const rect = control.getBoundingClientRect();
    const topElement = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return Boolean(
      topElement && (topElement === control || control.contains(topElement)),
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
  const { classId } = await createOpenClass({ attendance: true });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);
  await page.getByRole("link", { name: "Review and finalize" }).click();
  await expect(page).toHaveURL(new RegExp(`/staff/classes/${classId}/review$`));
  await expect(page.getByText("Post-class review")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Class & reporting" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();

  await page.locator(".roster-row-actions summary").first().click();
  await page.getByLabel("Hours").selectOption("3");
  await page.getByLabel("Minutes").selectOption("30");
  await page.getByLabel("Adjustment reason").selectOption("Left Early");
  await page.getByRole("button", { name: "Update credit" }).click();
  // The saved value is the source of truth; the row's own refresh is not asserted.
  await expect
    .poll(
      async () => {
        const pool = new Pool({ connectionString, max: 1 });
        const result = await pool.query<{ credited_hours: string }>(
          "select credited_hours from attendance where class_id = $1",
          [classId],
        );
        await pool.end();
        return result.rows[0]?.credited_hours;
      },
      { timeout: 20_000 },
    )
    .toBe("3.50");
  await expect(page.getByText("3h 30m / 4h")).toBeVisible();

  await page.getByRole("checkbox", { name: /I certify/i }).check();
  await page.getByLabel("Signature").fill("E2E Lead");
  await page.getByRole("button", { name: "Finalize roster" }).click();
  await expect.poll(() => classStatus(classId)).toBe("finalized");
});

test("the review screen omits the removed-attendance section when nothing was removed", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  await expect(page.getByText("Removed attendance")).toHaveCount(0);
  // A class that does not report to the MTU has no MTU usage area, and the
  // documents-and-delivery section is absent until a revision exists.
  await expect(page.locator("#area-mtu")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Documents & delivery" }),
  ).toHaveCount(0);
});

test("an MTU class presents one MTU editor and withholds finalization without usage", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });
  await addReportingSystem(classId, "mtu");

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  const mtuArea = page.locator("#area-mtu");
  await expect(mtuArea).toHaveCount(1);
  await mtuArea.getByRole("button", { name: "Edit" }).click();
  await expect(
    mtuArea.getByRole("button", { name: "Save and close" }),
  ).toHaveCount(1);

  // The review list states nothing is recorded, and missing usage withholds finalization.
  await expect(mtuArea.getByText("Nothing recorded.")).toBeVisible();
  await expect(page.getByText("No MTU usage recorded.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Finalize roster" }),
  ).toBeDisabled();

  // Recording free-text usage lists it and clears the blocker.
  await mtuArea.getByText("Additional details").click();
  await mtuArea.getByLabel("Other equipment (not listed)").fill("Test kit");
  await mtuArea.getByRole("button", { name: "Save and close" }).click();
  await expect(mtuArea.locator(".mtu-review")).toContainText("Test kit", {
    timeout: 15_000,
  });
  await expect(page.getByText("No MTU usage recorded.")).toHaveCount(0);
});

test("the roster flags a row that needs attention without expanding it", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });
  // An invalid credit flags the participant's row for attention.
  const pool = new Pool({ connectionString, max: 1 });
  await pool.query(
    "update attendance set credited_hours = 99 where class_id = $1",
    [classId],
  );
  await pool.end();

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  // The flagged row stays compact until the operator opens it.
  await expect(page.locator(".roster-row-attention")).toHaveCount(1);
  await expect(page.getByLabel("Hours")).toBeHidden();
  await page.locator(".roster-row-actions summary").first().click();
  await expect(page.getByLabel("Hours")).toBeVisible();
  // The blocker names the participant and links to the area that resolves it.
  await expect(
    page.getByText("Confirmed Guest has invalid credited hours."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Fix roster" })).toBeVisible();
});

test("raising a session's hours carries the full credit to the participant", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  // Raise the session's credited hours from the schedule area.
  const schedule = page.locator("#area-schedule");
  await schedule.getByRole("button", { name: "Edit" }).click();
  await schedule.getByLabel("Credited hours").first().selectOption("5");
  await schedule.getByRole("button", { name: "Save and close" }).click();
  await expect(schedule.getByLabel("Credited hours")).toHaveCount(0);

  // The participant at the previous total follows the new total.
  await expect
    .poll(
      async () => {
        const pool = new Pool({ connectionString, max: 1 });
        const result = await pool.query<{ credited_hours: string }>(
          "select credited_hours from attendance where class_id = $1",
          [classId],
        );
        await pool.end();
        return result.rows[0]?.credited_hours;
      },
      { timeout: 20_000 },
    )
    .toBe("5.00");
});

test("the workspace opens one correction area at a time", async ({ page }) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  const classArea = page.locator("#area-class");
  const scheduleArea = page.locator("#area-schedule");

  await classArea.getByRole("button", { name: "Edit" }).click();
  await expect(classArea.getByLabel("Class name")).toBeVisible();

  await scheduleArea.getByRole("button", { name: "Edit" }).click();
  await expect(scheduleArea.getByText("Training session")).toBeVisible();
  await expect(classArea.getByLabel("Class name")).toHaveCount(0);
  await expect(scheduleArea.locator("form")).toHaveCount(1);
  await scheduleArea.getByRole("button", { name: "Add session" }).click();
  await expect(scheduleArea.locator("form")).toHaveCount(1);
});

test("discard confirmation preserves or abandons workspace edits", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  const classArea = page.locator("#area-class");
  const scheduleArea = page.locator("#area-schedule");
  await classArea.getByRole("button", { name: "Edit" }).click();
  await classArea.getByLabel("Class name").fill("Unsaved class name");

  await scheduleArea.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByText("Discard unsaved changes?")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(classArea.getByLabel("Class name")).toHaveValue(
    "Unsaved class name",
  );

  await classArea.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByText("Discard unsaved changes?")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(classArea.getByLabel("Class name")).toHaveValue(
    "Unsaved class name",
  );

  await scheduleArea.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(classArea.getByLabel("Class name")).toHaveCount(0);
  await expect(scheduleArea.getByLabel("Credited hours")).toBeVisible();
});

test("a rejected workspace save leaves the editor open", async ({ page }) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  const classArea = page.locator("#area-class");
  await classArea.getByRole("button", { name: "Edit" }).click();
  await classArea.getByLabel("Host agency").evaluate((element) => {
    const select = element as HTMLSelectElement;
    select.required = false;
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await classArea.getByRole("button", { name: "Save and close" }).click();

  await expect(classArea.getByLabel("Host agency")).toBeVisible();
  await expect(classArea.locator(".form-error")).toBeVisible({
    timeout: 15_000,
  });
});

test("instructor controls do not show a workspace save action", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  const area = page.locator("#area-instructors");
  await area.getByRole("button", { name: "Edit" }).click();
  await expect(area.getByRole("button", { name: "Close" })).toBeVisible();
  await expect(
    area.getByRole("button", { name: "Save and close" }),
  ).toHaveCount(0);
});

test("instructors can be added, the lead changed, and the only lead kept", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString || !instructorUsername)
    return;
  const { classId } = await createOpenClass({ attendance: true });

  // The assisting instructor's display name, for the picker and the row.
  const pool = new Pool({ connectionString, max: 1 });
  const instructor = await pool.query<{ display_name: string }>(
    "select display_name from users where username = $1",
    [instructorUsername],
  );
  await pool.end();
  const instructorName = instructor.rows[0]?.display_name;
  if (!instructorName) throw new Error("E2E instructor was not found.");

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  const area = page.locator("#area-instructors");
  await area.getByRole("button", { name: "Edit" }).click();

  // Add the instructor as an assisting instructor.
  await area.getByLabel("Instructor").selectOption({ label: instructorName });
  await area.getByRole("button", { name: "Add instructor" }).click();

  const row = area.locator(".member-row", { hasText: instructorName });
  await expect(row.getByText("Assisting")).toBeVisible({ timeout: 15_000 });

  // Make them the lead; the previous lead becomes assisting.
  await row.getByRole("button", { name: "Make lead" }).click();
  await expect(row.getByText("Lead")).toBeVisible({ timeout: 15_000 });

  // Removing the only lead is refused.
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(
    area.getByText(/Assign another lead instructor before removing the lead/i),
  ).toBeVisible({ timeout: 15_000 });
});

test("the MTU review lists estimated and set supplies and advises without blocking", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });
  await addReportingSystem(classId, "mtu");

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);

  const mtuArea = page.locator("#area-mtu");
  await mtuArea.getByRole("button", { name: "Edit" }).click();

  // Two supplies whose quantities come from the roster estimate.
  await mtuArea.getByLabel("Tourniquet (each)", { exact: true }).check();
  await mtuArea
    .getByLabel("Trauma Moulage Kit (each)", { exact: true })
    .check();
  await mtuArea.getByRole("button", { name: "Save and close" }).click();

  await expect(mtuArea.locator(".mtu-review")).toContainText("estimated", {
    timeout: 15_000,
  });
  await expect(
    page.getByText("2 supplies still use the roster estimate."),
  ).toBeVisible();
  await expect(mtuArea.getByLabel("Tourniquet quantity")).toHaveCount(0);

  // Overriding one quantity marks it as set and shows the estimate.
  await mtuArea.getByRole("button", { name: "Edit" }).click();
  await mtuArea.getByLabel("Tourniquet quantity").fill("3");
  await mtuArea.getByRole("button", { name: "Save and close" }).click();
  await expect(mtuArea.locator(".mtu-review")).toContainText(
    "set · estimate 1",
    { timeout: 15_000 },
  );
  await expect(
    page.getByText("1 supply still uses the roster estimate."),
  ).toBeVisible();

  // The advisory opens the MTU area and does not withhold finalization.
  await page.getByRole("button", { name: "Review MTU usage" }).click();
  await expect(mtuArea.locator(".mtu-review")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Finalize roster" }),
  ).toBeEnabled();
});

test("credit is entered in 15-minute increments bounded by the total", async ({
  page,
}) => {
  skipUnlessEnabled();
  if (!username || !password || !connectionString) return;
  const { classId } = await createOpenClass({ attendance: true });

  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}/review`);
  await page.locator(".roster-row-actions summary").first().click();

  const hours = page.getByLabel("Hours");
  const minutes = page.getByLabel("Minutes");

  await hours.selectOption("3");
  await expect(minutes.locator("option")).toHaveText(["00", "15", "30", "45"]);

  // The top hour of a four-hour class only offers the zero minute.
  await hours.selectOption("4");
  await expect(minutes.locator("option")).toHaveText(["00"]);
});
