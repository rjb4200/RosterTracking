import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

/**
 * Known violations, recorded as finding H-8 in `docs/hardening-findings.md`.
 * Remove an entry when its cause is fixed; a new violation id still fails.
 */
const KNOWN_CONTRAST = ["color-contrast"];

/**
 * Reports what an operator cannot work around: `critical` and `serious` axe
 * violations, with the offending selectors so a failure is actionable. Minor
 * and moderate findings are recorded in the findings log instead of gating.
 */
function blockingViolations(
  violations: {
    id: string;
    impact?: string | null;
    nodes: { target: (string | string[])[] }[];
  }[],
  allowed: string[] = [],
) {
  return violations
    .filter(
      (violation) =>
        (violation.impact === "critical" || violation.impact === "serious") &&
        !allowed.includes(violation.id),
    )
    .map(
      (violation) =>
        `${violation.id} @ ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(" | ")}`,
    );
}

test("the public landing page has no blocking violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(blockingViolations(results.violations)).toEqual([]);
});

test("the public sign-in entry has no blocking violations", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const results = await new AxeBuilder({ page }).analyze();
  expect(blockingViolations(results.violations)).toEqual([]);
});

test("the staff login page has no new blocking violations", async ({
  page,
}) => {
  await page.goto("/staff/login");
  const results = await new AxeBuilder({ page }).analyze();
  expect(blockingViolations(results.violations, KNOWN_CONTRAST)).toEqual([]);
});

test("the staff workspace has no new blocking violations", async ({ page }) => {
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff");
  const results = await new AxeBuilder({ page }).analyze();
  expect(blockingViolations(results.violations, KNOWN_CONTRAST)).toEqual([]);
});
