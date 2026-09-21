import { expect, type Page, test } from "@playwright/test";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

/**
 * Generous ceilings, deliberately far above what a local production build
 * does. This is a regression tripwire, not a performance target: a route that
 * breaches these has something structurally wrong with it. Real budgets need a
 * deployed target and a defined user population, which this review does not
 * have.
 */
const BUDGETS = { ttfbMs: 1500, loadMs: 5000 };

async function timing(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (!nav) throw new Error("No navigation timing entry.");
    return {
      ttfbMs: Math.round(nav.responseStart - nav.requestStart),
      loadMs: Math.round(nav.loadEventEnd - nav.startTime),
    };
  });
}

function expectWithinBudget(
  label: string,
  measured: Awaited<ReturnType<typeof timing>>,
) {
  expect(measured.ttfbMs, `${label} time to first byte`).toBeLessThanOrEqual(
    BUDGETS.ttfbMs,
  );
  expect(measured.loadMs, `${label} load`).toBeLessThanOrEqual(BUDGETS.loadMs);
}

test("the public landing page is within budget", async ({ page }) => {
  expectWithinBudget("/", await timing(page, "/"));
});

test("the public sign-in entry is within budget", async ({ page }) => {
  expectWithinBudget("/sign-in", await timing(page, "/sign-in"));
});

test("the staff workspace and class list are within budget", async ({
  page,
}) => {
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password) return;

  await signIn(page, username, password);
  expectWithinBudget("/staff", await timing(page, "/staff"));
  expectWithinBudget("/staff/classes", await timing(page, "/staff/classes"));
});
