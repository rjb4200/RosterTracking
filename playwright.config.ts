import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env" });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "playwright-secret-at-least-32-characters-long",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://unused:unused@127.0.0.1:5432/unused",
      DATABASE_URL_DIRECT:
        process.env.TEST_DATABASE_URL ??
        "postgresql://unused:unused@127.0.0.1:5432/unused",
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      CREDENTIAL_ENCRYPTION_KEY:
        process.env.CREDENTIAL_ENCRYPTION_KEY ??
        "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    },
  },
});
