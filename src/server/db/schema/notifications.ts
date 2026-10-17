import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { attendance } from "./student-sign-in";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const EMAIL_DELIVERY_STATUSES = {
  QUEUED: "queued",
  SENT: "sent",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

/**
 * A durable outbox row for one outbound email. Written in the transaction that
 * requests it and dispatched after that transaction commits so delivery can
 * never block or roll back the originating operation.
 */
export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    template: text("template").notNull(),
    templateVersion: text("template_version").notNull(),
    // The immutable source this message was derived from (for example a
    // finalization revision). Kept generic so more messages can reuse the box.
    // For a scheduled message addressed to an account, this is that account.
    referenceType: text("reference_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    // The period a scheduled message covers (a department calendar day), empty
    // for per-participant messages. Part of the delivery identity so one digest
    // per account and period is sent.
    period: text("period").default("").notNull(),
    // The participant this message belongs to, when the message is personal.
    attendanceId: uuid("attendance_id").references(() => attendance.id, {
      onDelete: "restrict",
    }),
    recipient: text("recipient").notNull(),
    sender: text("sender").notNull(),
    status: text("status").default("queued").notNull(),
    // A digest of the message's meaningful values, used to suppress resends of
    // an unchanged certificate.
    contentFingerprint: text("content_fingerprint").notNull(),
    providerMessageId: text("provider_message_id"),
    failureReason: text("failure_reason"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("email_deliveries_reference_attendance_template_unique").on(
      table.referenceId,
      table.attendanceId,
      table.template,
      table.period,
    ),
    // A scheduled message addressed to an account has no attendance row, so the
    // participant index above cannot dedupe it (nulls are distinct). This
    // partial index makes one scheduled message per source, template, and
    // period.
    uniqueIndex("email_deliveries_scheduled_unique")
      .on(table.referenceId, table.template, table.period)
      .where(sql`${table.attendanceId} is null`),
    index("email_deliveries_reference_idx").on(table.referenceId),
    index("email_deliveries_attendance_status_idx").on(
      table.attendanceId,
      table.status,
    ),
    index("email_deliveries_status_idx").on(table.status, table.createdAt),
    check(
      "email_deliveries_status_valid",
      sql`${table.status} in ('queued', 'sent', 'failed', 'skipped')`,
    ),
    check(
      "email_deliveries_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "email_deliveries_recipient_not_blank",
      sql`length(btrim(${table.recipient})) > 0`,
    ),
    check(
      "email_deliveries_sender_not_blank",
      sql`length(btrim(${table.sender})) > 0`,
    ),
    check(
      "email_deliveries_fingerprint_not_blank",
      sql`length(btrim(${table.contentFingerprint})) > 0`,
    ),
  ],
);

export type EmailDelivery = typeof emailDeliveries.$inferSelect;
export type NewEmailDelivery = typeof emailDeliveries.$inferInsert;
