import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();

function expectHardened(headers: Record<string, string>) {
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();
}

test("a public response carries the security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  expectHardened(response?.headers() ?? {});
});

test("the public sign-in entry carries the security headers", async ({
  page,
}) => {
  const response = await page.goto("/sign-in");
  expect(response).not.toBeNull();
  expectHardened(response?.headers() ?? {});
});

test("a staff response carries the security headers", async ({ page }) => {
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password) return;

  await signIn(page, username, password);
  const response = await page.goto("/staff");
  expect(response).not.toBeNull();
  expectHardened(response?.headers() ?? {});
});
