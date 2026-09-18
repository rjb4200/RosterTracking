/**
 * Single source of truth for the database the browser suite talks to.
 *
 * The browser server is configured with the same value in playwright.config.ts,
 * so a spec's fixtures and the application under test always share one database.
 */
export function e2eDatabaseUrl(): string | undefined {
  const value = process.env.E2E_DATABASE_URL?.trim();
  return value ? value : undefined;
}
