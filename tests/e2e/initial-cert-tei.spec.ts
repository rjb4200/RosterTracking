import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const instructorUsername = process.env.E2E_INSTRUCTOR_USERNAME;
const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD;

test("an administrator can change the initial-certification TEI number", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "TEI number coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff/agencies");

  // The control is collapsed until expanded.
  await expect(page.getByLabel("Initial certification TEI")).toBeHidden();
  await page.getByText("Initial certification settings").click();

  const field = page.getByLabel("Initial certification TEI");
  await expect(field).toBeVisible();
  const original = await field.inputValue();

  await field.fill("129");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("TEI number updated.")).toBeVisible();

  // Restore the original value so the shared development database is unchanged.
  await field.fill(original);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("TEI number updated.")).toBeVisible();
});

test("a non-administrator is not offered the TEI number control", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "TEI number coverage runs once on chromium.",
  );
  test.skip(
    !instructorUsername || !instructorPassword,
    "Set E2E instructor credentials.",
  );
  if (!instructorUsername || !instructorPassword) return;

  await signIn(page, instructorUsername, instructorPassword);
  await page.goto("/staff/agencies");

  // A non-administrator never gets the control, whether or not they can view
  // the Agencies page.
  await expect(page.getByText("Initial certification settings")).toHaveCount(0);
  await expect(page.getByLabel("Initial certification TEI")).toHaveCount(0);
});
