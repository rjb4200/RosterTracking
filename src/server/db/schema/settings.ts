import { pgTable, text } from "drizzle-orm/pg-core";

/**
 * Single-row-per-key application settings. Keys are stable identifiers (for
 * example `initial_cert.tei`) read by services with an in-code default, so a
 * missing row never requires a data migration.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
