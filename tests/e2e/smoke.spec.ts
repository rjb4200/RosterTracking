import { expect, type Page, test } from "@playwright/test";

import { signIn } from "./support/auth";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;

/**
 * These journeys create no domain records. They never submit a class, roster,
 * or reference form, so the subset is safe to run against a database that has
 * not been reset. Signing in does record the usual staff login audit event.
 */
async function expectNoRenderError(page: Page) {
  await expect(
    page.getByText(
      /application error|server-side exception|unhandled runtime error|internal server error/i,
    ),
  ).toHaveCount(0);
}

test.describe("@smoke critical pages render", () => {
  test("public class sign-in entry renders", async ({ page }) => {
    const response = await page.goto("/sign-in");
    expect(response?.status() ?? 200).toBeLessThan(400);
    await expect(
      page.getByRole("heading", { name: "Class sign-in unavailable" }),
    ).toBeVisible();
    await expectNoRenderError(page);
  });

  test("no framework error text appears on public entry paths", async ({
    page,
  }) => {
    for (const path of [
      "/sign-in",
      "/sign-in?status=unavailable",
      "/sign-in?step=guest",
      "/sign-in/not-a-real-token",
      "/ZZZZ",
    ]) {
      const response = await page.goto(path);
      expect(response?.status() ?? 200).toBeLessThan(500);
      await expect(
        page.getByText(
          /application error|server-side exception|unhandled runtime error|internal server error|this page couldn't load/i,
        ),
      ).toHaveCount(0);
    }
  });

  test("credential key health is reported to staff", async ({ page }) => {
    test.skip(!username || !password, "Set E2E staff credentials.");
    if (!username || !password) return;

    await signIn(page, username, password);
    const response = await page.request.get("/api/staff/key-health");
    expect([200, 503]).toContain(response.status());
    const report = await response.json();
    expect(report).toHaveProperty("probeOk");
    expect(report).toHaveProperty("healthy");
    expect(report).toHaveProperty("message");
  });

  test("staff workspace and class list render", async ({ page }) => {
    test.skip(!username || !password, "Set E2E staff credentials.");
    if (!username || !password) return;

    await signIn(page, username, password);
    await expect(page).toHaveURL(/\/staff\/(admin|instructor)$/);
    await expectNoRenderError(page);

    const listResponse = await page.goto("/staff/classes");
    expect(listResponse?.status() ?? 200).toBeLessThan(400);
    await expect(
      page.getByRole("heading", { name: "Classes", exact: true }),
    ).toBeVisible();
    await expectNoRenderError(page);

    const classLink = page.locator('a[href^="/staff/classes/"]').first();
    if (await classLink.count()) {
      const href = await classLink.getAttribute("href");
      const detailResponse = await page.goto(href ?? "/staff/classes");
      expect(detailResponse?.status() ?? 200).toBeLessThan(400);
      await expectNoRenderError(page);
    } else {
      await expect(page.getByText(/no active classes found/i)).toBeVisible();
    }
  });

  test("reporting queue renders for an operator who can see it", async ({
    page,
  }) => {
    test.skip(!username || !password, "Set E2E staff credentials.");
    if (!username || !password) return;

    await signIn(page, username, password);
    const reportingLink = page.getByRole("link", { name: "Reporting" });
    test.skip(
      !(await reportingLink.count()),
      "Account has no reporting queue.",
    );
    if (!(await reportingLink.count())) return;

    await reportingLink.click();
    await expect(
      page.getByRole("heading", { name: "Reporting queue" }),
    ).toBeVisible();
    await expectNoRenderError(page);
  });
});
