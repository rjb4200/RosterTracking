import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

const KBEMS_DESTINATION = "KBEMS / KEMSIS";

/**
 * Reaches the class-and-schedule step of the wizard for a KBEMS class, where
 * the inline "add site" and "add agency" controls live.
 */
async function reachClassStep(page: import("@playwright/test").Page) {
  await page.goto("/staff/classes/new");
  await page.getByLabel(KBEMS_DESTINATION).check();
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

test("adds a site and an agency with details from the wizard popups", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Inline creation coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  const suffix = crypto.randomUUID().slice(0, 8);
  const siteName = `E2E Popup Site ${suffix}`;
  const agencyName = `E2E Popup Agency ${suffix}`;

  await signIn(page, username, password);
  await reachClassStep(page);

  // Add a site with details.
  await page.getByRole("button", { name: "Add a new site" }).click();
  const siteDialog = page.getByRole("dialog");
  await expect(
    siteDialog.getByRole("heading", { name: "Add a training site" }),
  ).toBeVisible();
  await expect(
    siteDialog.getByRole("checkbox", {
      name: "Default training site for new classes",
    }),
  ).toHaveCount(0);
  await siteDialog.getByLabel("Site name").fill(siteName);
  await siteDialog.getByLabel("Address").fill("1 Main St");
  await siteDialog.getByRole("button", { name: "Add site" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page
      .getByRole("combobox", { name: "Training site" })
      .locator("option", { hasText: siteName }),
  ).toHaveCount(1);

  // Add an agency with details.
  await page.getByRole("button", { name: "Add a new agency" }).click();
  const agencyDialog = page.getByRole("dialog");
  await expect(
    agencyDialog.getByRole("heading", { name: "Add a host agency" }),
  ).toBeVisible();
  await expect(
    agencyDialog.getByRole("checkbox", {
      name: "Default host agency for new classes",
    }),
  ).toHaveCount(0);
  await agencyDialog.getByLabel("Name", { exact: true }).fill(agencyName);
  await agencyDialog.getByLabel("Contact name").fill("Jane Doe");
  await agencyDialog.getByRole("button", { name: "Add agency" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const hostAgency = page.getByRole("combobox", { name: "Host agency" });
  await expect(
    hostAgency.locator("option", { hasText: agencyName }),
  ).toHaveCount(1);

  // Adding the same agency name again reuses the existing agency.
  await page.getByRole("button", { name: "Add a new agency" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill(agencyName);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add agency" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    hostAgency.locator("option", { hasText: agencyName }),
  ).toHaveCount(1);
});
