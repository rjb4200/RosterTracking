import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env" });

const e2ePort = 3100;
const e2eBaseUrl = `http://localhost:${e2ePort}`;
// The browser suite only ever talks to the dedicated end-to-end database.
// Run `npm run db:reset:e2e` to prepare it (see docs/verification.md).
const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://unused:unused@127.0.0.1:5432/unused";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    env: {
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "playwright-secret-at-least-32-characters-long",
      NEXTAUTH_SECRET:
        process.env.AUTH_SECRET ??
        "playwright-secret-at-least-32-characters-long",
      DATABASE_URL: e2eDatabaseUrl,
      DATABASE_URL_DIRECT: e2eDatabaseUrl,
      NEXTAUTH_URL: e2eBaseUrl,
      CREDENTIAL_ENCRYPTION_KEY:
        process.env.CREDENTIAL_ENCRYPTION_KEY ??
        "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    },
  },
});
