import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  EMAIL_DELIVERY_STATUSES,
  type EmailDelivery,
  emailDeliveries,
} from "@/server/db/schema";

import { EMAIL_SENDER, type OutboundEmail, sendEmail } from "./client";

export type EmailDeliveryStatus =
  (typeof EMAIL_DELIVERY_STATUSES)[keyof typeof EMAIL_DELIVERY_STATUSES];

export const EMAIL_REFERENCE_TYPES = {
  FINALIZATION_REVISION: "finalization_revision",
} as const;

export interface EnqueueEmailInput {
  template: string;
  templateVersion: string;
  referenceType: string;
  referenceId: string;
  // Empty for per-participant messages; a period (department calendar day) for
  // scheduled messages addressed to an account.
  period?: string;
  attendanceId?: string | null;
  recipient: string;
  contentFingerprint: string;
  status?: EmailDeliveryStatus;
}

function deliveryIdentity(input: {
  referenceId: string;
  template: string;
  period: string;
  attendanceId?: string | null;
}) {
  const filters = [
    eq(emailDeliveries.referenceId, input.referenceId),
    eq(emailDeliveries.template, input.template),
    eq(emailDeliveries.period, input.period),
  ];
  filters.push(
    input.attendanceId
      ? eq(emailDeliveries.attendanceId, input.attendanceId)
      : isNull(emailDeliveries.attendanceId),
  );
  return and(...filters);
}

/**
 * Writes a durable queued delivery inside the caller's transaction. A delivery
 * already recorded for the same source, participant, and template is returned
 * unchanged so re-enqueuing is idempotent.
 */
export async function enqueueEmail(
  transaction: DatabaseTransaction,
  input: EnqueueEmailInput,
): Promise<EmailDelivery> {
  const attendeeKey = input.attendanceId ?? null;
  const period = input.period ?? "";
  const [inserted] = await transaction
    .insert(emailDeliveries)
    .values({
      template: input.template,
      templateVersion: input.templateVersion,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      period,
      attendanceId: attendeeKey,
      recipient: input.recipient,
      sender: EMAIL_SENDER,
      status: input.status ?? EMAIL_DELIVERY_STATUSES.QUEUED,
      contentFingerprint: input.contentFingerprint,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;
  const [existing] = await transaction
    .select()
    .from(emailDeliveries)
    .where(
      deliveryIdentity({
        referenceId: input.referenceId,
        template: input.template,
        period,
        attendanceId: attendeeKey,
      }),
    )
    .limit(1);
  if (!existing) throw new Error("Email delivery could not be recorded.");
  return existing;
}

/** The most recent sent fingerprint for a participant and template, if any. */
export async function findLastSentFingerprint(
  db: Database | DatabaseTransaction,
  attendanceId: string,
  template: string,
): Promise<string | null> {
  const [row] = await db
    .select({ fingerprint: emailDeliveries.contentFingerprint })
    .from(emailDeliveries)
    .where(
      and(
        eq(emailDeliveries.attendanceId, attendanceId),
        eq(emailDeliveries.template, template),
        eq(emailDeliveries.status, EMAIL_DELIVERY_STATUSES.SENT),
      ),
    )
    .orderBy(desc(emailDeliveries.sentAt), desc(emailDeliveries.createdAt))
    .limit(1);
  return row?.fingerprint ?? null;
}

export async function listDeliveriesForReference(
  db: Database | DatabaseTransaction,
  referenceType: string,
  referenceId: string,
): Promise<EmailDelivery[]> {
  return db
    .select()
    .from(emailDeliveries)
    .where(
      and(
        eq(emailDeliveries.referenceType, referenceType),
        eq(emailDeliveries.referenceId, referenceId),
      ),
    )
    .orderBy(desc(emailDeliveries.createdAt));
}

export async function findDeliveryForParticipant(
  db: Database | DatabaseTransaction,
  referenceId: string,
  attendanceId: string,
  template: string,
): Promise<EmailDelivery | null> {
  const [row] = await db
    .select()
    .from(emailDeliveries)
    .where(
      and(
        eq(emailDeliveries.referenceId, referenceId),
        eq(emailDeliveries.template, template),
        eq(emailDeliveries.attendanceId, attendanceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listQueuedDeliveries(
  db: Database,
  referenceType: string,
  referenceId: string,
  template?: string,
): Promise<EmailDelivery[]> {
  const filters = [
    eq(emailDeliveries.referenceType, referenceType),
    eq(emailDeliveries.referenceId, referenceId),
    inArray(emailDeliveries.status, [
      EMAIL_DELIVERY_STATUSES.QUEUED,
      EMAIL_DELIVERY_STATUSES.FAILED,
    ]),
  ];
  if (template) filters.push(eq(emailDeliveries.template, template));
  return db
    .select()
    .from(emailDeliveries)
    .where(and(...filters));
}

const incrementAttempt = sql`attempt_count + 1`;

export async function markDeliverySent(
  db: Database,
  deliveryId: string,
  providerMessageId: string | null,
) {
  await db
    .update(emailDeliveries)
    .set({
      status: EMAIL_DELIVERY_STATUSES.SENT,
      providerMessageId,
      failureReason: null,
      sentAt: new Date(),
      attemptCount: incrementAttempt,
      updatedAt: new Date(),
    })
    .where(eq(emailDeliveries.id, deliveryId));
}

export async function markDeliveryFailed(
  db: Database,
  deliveryId: string,
  reason: string,
) {
  await db
    .update(emailDeliveries)
    .set({
      status: EMAIL_DELIVERY_STATUSES.FAILED,
      failureReason: reason,
      attemptCount: incrementAttempt,
      updatedAt: new Date(),
    })
    .where(eq(emailDeliveries.id, deliveryId));
}

export async function updateDeliveryRecipient(
  db: Database,
  deliveryId: string,
  recipient: string,
) {
  await db
    .update(emailDeliveries)
    .set({ recipient, updatedAt: new Date() })
    .where(eq(emailDeliveries.id, deliveryId));
}

export type DeliveryMessageRenderer = (
  delivery: EmailDelivery,
) => Promise<OutboundEmail | null>;

/**
 * Attempts each delivery through the shared sender and records the outcome.
 * A failure never throws into the caller: the originating operation has already
 * committed and delivery is best-effort and retryable.
 */
export async function dispatchDeliveries(
  db: Database,
  deliveries: EmailDelivery[],
  render: DeliveryMessageRenderer,
): Promise<void> {
  for (const delivery of deliveries) {
    try {
      const message = await render(delivery);
      if (!message) continue;
      const result = await sendEmail(message);
      await markDeliverySent(db, delivery.id, result.providerMessageId);
    } catch {
      await markDeliveryFailed(db, delivery.id, "Delivery failed.");
    }
  }
}
