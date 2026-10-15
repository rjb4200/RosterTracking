import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("a staff member can open and submit the issue report form", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Issue-report coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff");

  await page.getByRole("button", { name: "Report an issue" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Report an issue")).toBeVisible();
  await expect(dialog.getByLabel("Category")).toBeVisible();
  await expect(dialog.getByLabel("Subject")).toBeVisible();
  await expect(dialog.getByLabel("What happened?")).toBeVisible();
  await expect(dialog.getByText(/Do not include student names/)).toBeVisible();

  await dialog.getByLabel("Subject").fill("E2E report");
  await dialog.getByLabel("What happened?").fill("Testing the report form.");
  await dialog.getByRole("button", { name: "Submit report" }).click();

  // The token is blanked for the suite, so filing refuses cleanly and no issue
  // is created on the public repository.
  await expect(
    dialog.getByText("Issue reporting is not configured."),
  ).toBeVisible();
});
