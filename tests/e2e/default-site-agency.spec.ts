import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const adminUsername = process.env.E2E_STAFF_USERNAME;
const adminPassword = process.env.E2E_STAFF_PASSWORD;
const instructorUsername = process.env.E2E_INSTRUCTOR_USERNAME;
const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD;
const connectionString = e2eDatabaseUrl();

test.setTimeout(120_000);

function skipUnlessAdminEnabled() {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating default-reference coverage runs once on chromium.",
  );
  test.skip(
    !adminUsername || !adminPassword || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
}

async function clearDefaults() {
  if (!connectionString) return;
  const pool = new Pool({ connectionString, max: 1 });
  await pool.query("update training_sites set is_default = false");
  await pool.query("update agencies set is_default = false");
  await pool.end();
}

async function reachClassStep(page: import("@playwright/test").Page) {
  await page.goto("/staff/classes/new");
  await page.getByLabel("KBEMS / KEMSIS").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("EMS course name").fill("EMT Refresher");
  await page.getByLabel("Course type").selectOption("refresher");
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: "Airway" });
  await page
    .getByLabel("Course description or objectives")
    .fill("Review of EMT skills");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Classroom" })).toBeChecked();
}

test("an administrator sets site and agency defaults and new classes preselect them", async ({
  page,
}) => {
  skipUnlessAdminEnabled();
  if (!adminUsername || !adminPassword) return;
  try {
    const suffix = randomUUID().slice(0, 8);
    const firstSite = `Default Site A ${suffix}`;
    const secondSite = `Default Site B ${suffix}`;
    const firstAgency = `Default Agency A ${suffix}`;
    const secondAgency = `Default Agency B ${suffix}`;

    await signIn(page, adminUsername, adminPassword);

    // Create the first site default.
    await page.goto("/staff/sites/new");
    await page.getByLabel("Site name").fill(firstSite);
    await page
      .getByRole("checkbox", { name: "Default training site for new classes" })
      .check();
    await page.getByRole("button", { name: "Create site" }).click();
    await expect(
      page.getByRole("heading", { name: "Training sites" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("row", { name: new RegExp(firstSite) })
        .getByText("Default", { exact: true }),
    ).toBeVisible();

    // Creating a second default warns before replacing the first.
    await page.goto("/staff/sites/new");
    await page.getByLabel("Site name").fill(secondSite);
    await page
      .getByRole("checkbox", { name: "Default training site for new classes" })
      .check();
    await expect(
      page.getByText(new RegExp(`Saving will replace ${firstSite}`)),
    ).toBeVisible();
    await page.getByRole("button", { name: "Create site" }).click();

    const secondSiteRow = page.getByRole("row", {
      name: new RegExp(secondSite),
    });
    await expect(
      secondSiteRow.getByText("Default", { exact: true }),
    ).toBeVisible();
    const firstSiteRow = page.getByRole("row", { name: new RegExp(firstSite) });
    await expect(
      firstSiteRow.getByText("Default", { exact: true }),
    ).toHaveCount(0);

    // Create the first agency default, then replace it with a second.
    await page.goto("/staff/agencies/new");
    await page.getByLabel("Name", { exact: true }).fill(firstAgency);
    await page
      .getByRole("checkbox", { name: "Default host agency for new classes" })
      .check();
    await page.getByRole("button", { name: "Create agency" }).click();
    await expect(page.getByRole("heading", { name: "Agencies" })).toBeVisible();

    await page.goto("/staff/agencies/new");
    await page.getByLabel("Name", { exact: true }).fill(secondAgency);
    await page
      .getByRole("checkbox", { name: "Default host agency for new classes" })
      .check();
    await expect(
      page.getByText(new RegExp(`Saving will replace ${firstAgency}`)),
    ).toBeVisible();
    await page.getByRole("button", { name: "Create agency" }).click();

    const secondAgencyRow = page.getByRole("row", {
      name: new RegExp(secondAgency),
    });
    await expect(
      secondAgencyRow.getByText("Default", { exact: true }),
    ).toBeVisible();

    // New classes start with both defaults selected.
    await reachClassStep(page);
    await expect(
      page
        .getByRole("combobox", { name: "Training site" })
        .locator("option:checked"),
    ).toHaveText(secondSite);
    await expect(
      page
        .getByRole("combobox", { name: "Host agency" })
        .locator("option:checked"),
    ).toHaveText(secondAgency);

    // The default record cannot be deactivated or archived.
    await page.goto("/staff/sites");
    await page.getByRole("link", { name: secondSite }).click();
    await expect(
      page.getByRole("button", { name: "Deactivate", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Archive", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        /Clear the default setting before deactivating or archiving/i,
      ),
    ).toBeVisible();

    // Clearing the default warns, then restores the lifecycle actions.
    await page
      .getByRole("checkbox", { name: "Default training site for new classes" })
      .uncheck();
    await expect(
      page.getByText(
        /Saving will leave new classes without a default training site/i,
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("button", { name: "Deactivate", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Archive", exact: true }),
    ).toBeVisible();
  } finally {
    await clearDefaults();
  }
});

test("a non-administrator is not offered the default checkboxes", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Default-reference coverage runs once on chromium.",
  );
  test.skip(
    !instructorUsername || !instructorPassword,
    "Set E2E instructor credentials.",
  );
  if (!instructorUsername || !instructorPassword) return;

  await signIn(page, instructorUsername, instructorPassword);
  await page.goto("/staff/sites/new");
  await expect(
    page.getByRole("checkbox", {
      name: "Default training site for new classes",
    }),
  ).toHaveCount(0);
  await page.goto("/staff/agencies/new");
  await expect(
    page.getByRole("checkbox", { name: "Default host agency for new classes" }),
  ).toHaveCount(0);
});
