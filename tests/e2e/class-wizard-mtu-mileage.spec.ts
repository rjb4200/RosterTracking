import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

test("the wizard blocks the MTU step until a driving transport has mileage", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Mutating class-creation coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");

  // Select the MTU destination and advance to its step.
  await page.getByLabel("Mobile Training Unit").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mobile Training Unit usage" }),
  ).toBeVisible();

  // Selecting a driving transport requires mileage before leaving the step.
  await page.getByLabel("Ford Transit Van 15 passenger").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Complete the highlighted fields."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mobile Training Unit usage" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Ford Transit Van 15 passenger mileage estimate"),
  ).toHaveAttribute("aria-invalid", "true");

  // A mileage estimate clears the requirement and lets the wizard advance.
  await page
    .getByLabel("Ford Transit Van 15 passenger mileage estimate")
    .fill("120");
  await page.getByLabel("POV", { exact: true }).check();
  await expect(
    page.getByLabel("POV mileage estimate (optional)", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("POV mileage estimate (optional)", { exact: true })
    .fill("25.5");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Delivery method")).toBeVisible();
});

test("deselecting a driving transport drops its mileage requirement", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Wizard coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;
  await signIn(page, username, password);
  await page.goto("/staff/classes/new");
  await page.getByLabel("Mobile Training Unit").check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByLabel("Ford Transit Van 15 passenger", { exact: true })
    .check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Complete the highlighted fields."),
  ).toBeVisible();
  await page
    .getByLabel("Ford Transit Van 15 passenger", { exact: true })
    .uncheck();
  await page.getByLabel("POV", { exact: true }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Delivery method")).toBeVisible();
});
