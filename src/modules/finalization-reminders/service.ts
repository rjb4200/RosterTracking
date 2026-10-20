import "server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import {
  formatDepartmentDateTime,
  getDepartmentCalendarDate,
} from "@/modules/classes/time";
import { loadLogoAttachment } from "@/modules/notifications/assets";
import { sendEmail } from "@/modules/notifications/client";
import {
  enqueueEmail,
  markDeliveryFailed,
  markDeliverySent,
} from "@/modules/notifications/service";
import {
  CLASS_REMINDER_EMAIL_TEMPLATE,
  CLASS_REMINDER_EMAIL_TEMPLATE_VERSION,
  renderClassReminderEmail,
} from "@/modules/notifications/templates";
import type { Database } from "@/server/db/client";
import {
  classComponents,
  classInstructors,
  EMAIL_DELIVERY_STATUSES,
  finalizationRevisions,
  trainingClasses,
  users,
} from "@/server/db/schema";

import {
  groupReminders,
  isReminderDue,
  type ReminderAccount,
  type ReminderClass,
  type ReminderInstructor,
} from "./domain";

const REMINDER_REFERENCE_TYPE = "class_finalization_reminder";

export interface ReminderRunSummary {
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
}

function asDate(value: Date | string | null): Date | null {
  if (value === null) return null;
  return value instanceof Date ? value : new Date(value);
}

/**
 * Collects open classes whose final scheduled session ended more than the
 * reminder delay ago, resolves each class's signing instructor, and returns one
 * digest per deliverable recipient.
 */
export async function collectReminderDigests(db: Database, now = new Date()) {
  const openRows = await db
    .select({
      classId: trainingClasses.id,
      className: sql<
        string | null
      >`coalesce(${trainingClasses.name}, 'Training class')`,
    })
    .from(trainingClasses)
    .where(eq(trainingClasses.status, "open"));

  const endRows = openRows.length
    ? await db
        .select({
          classId: classComponents.classId,
          endsAt: sql<Date | string | null>`max(${classComponents.endsAt})`,
        })
        .from(classComponents)
        .where(
          inArray(
            classComponents.classId,
            openRows.map((row) => row.classId),
          ),
        )
        .groupBy(classComponents.classId)
    : [];
  const endsByClass = new Map(
    endRows.map((row) => [row.classId, asDate(row.endsAt)]),
  );

  const classes = openRows
    .map((row) => ({
      classId: row.classId,
      className: row.className ?? "Training class",
      finalSessionEndsAt: endsByClass.get(row.classId) ?? null,
    }))
    .filter(
      (
        row,
      ): row is {
        classId: string;
        className: string;
        finalSessionEndsAt: Date;
      } => isReminderDue(row.finalSessionEndsAt, now),
    );

  const instructorRows = classes.length
    ? await db
        .select({
          classId: classInstructors.classId,
          userId: classInstructors.userId,
          isLead: classInstructors.isLead,
          email: users.email,
          isActive: users.isActive,
          displayName: users.displayName,
        })
        .from(classInstructors)
        .innerJoin(users, eq(users.id, classInstructors.userId))
        .where(
          inArray(
            classInstructors.classId,
            classes.map((row) => row.classId),
          ),
        )
    : [];

  const accounts = new Map<string, ReminderAccount>();
  const instructorsByClass = new Map<string, ReminderInstructor[]>();
  for (const row of instructorRows) {
    accounts.set(row.userId, {
      userId: row.userId,
      email: row.email,
      isActive: row.isActive,
      displayName: row.displayName,
    });
    const list = instructorsByClass.get(row.classId) ?? [];
    list.push({ userId: row.userId, isLead: row.isLead });
    instructorsByClass.set(row.classId, list);
  }

  const pendingFireRows = await db
    .select({
      classId: trainingClasses.id,
      className: sql<
        string | null
      >`coalesce(${trainingClasses.name}, 'Training class')`,
      fireSignerUserId: finalizationRevisions.fireSignerUserId,
      finalizedAt: finalizationRevisions.finalizedAt,
    })
    .from(finalizationRevisions)
    .innerJoin(
      trainingClasses,
      eq(trainingClasses.id, finalizationRevisions.classId),
    )
    .where(
      and(
        eq(trainingClasses.status, "finalized"),
        isNotNull(finalizationRevisions.fireSignerUserId),
        sql`${finalizationRevisions.revisionNumber} = (
          select max(fr2.revision_number)
          from finalization_revisions fr2
          where fr2.class_id = ${finalizationRevisions.classId}
        )`,
        sql`not exists (
          select 1 from revision_attestations ra
          where ra.revision_id = ${finalizationRevisions.id} and ra.scope = 'fire'
        )`,
        sql`not exists (
          select 1 from finalization_fire_attestations fa
          where fa.revision_id = ${finalizationRevisions.id}
        )`,
      ),
    );

  const signerIds = [
    ...new Set(
      pendingFireRows.flatMap((row) =>
        row.fireSignerUserId ? [row.fireSignerUserId] : [],
      ),
    ),
  ];
  if (signerIds.length) {
    const signerRows = await db
      .select({
        userId: users.id,
        email: users.email,
        isActive: users.isActive,
        displayName: users.displayName,
      })
      .from(users)
      .where(inArray(users.id, signerIds));
    for (const row of signerRows) {
      accounts.set(row.userId, {
        userId: row.userId,
        email: row.email,
        isActive: row.isActive,
        displayName: row.displayName,
      });
    }
  }

  const pendingFireClasses: ReminderClass[] = pendingFireRows.flatMap((row) =>
    row.fireSignerUserId
      ? [
          {
            classId: row.classId,
            className: row.className ?? "Training class",
            finalSessionEndsAt: asDate(row.finalizedAt) ?? new Date(),
            instructors: [],
            recipientUserId: row.fireSignerUserId,
            action: "sign_fire" as const,
          },
        ]
      : [],
  );

  if (!classes.length && !pendingFireClasses.length) return [];

  const reminderClasses: ReminderClass[] = [
    ...classes.map((row) => ({
      ...row,
      instructors: instructorsByClass.get(row.classId) ?? [],
      action: "finalize" as const,
    })),
    ...pendingFireClasses,
  ];

  return groupReminders(reminderClasses, accounts);
}

/**
 * Runs the daily reminder: one digest per signing instructor for the current
 * department day, suppressing a repeat for the same day. Delivery failures are
 * recorded and never throw into the schedule.
 */
export async function runFinalizationReminders(
  db: Database,
  now = new Date(),
): Promise<ReminderRunSummary> {
  const digests = await collectReminderDigests(db, now);
  const period = getDepartmentCalendarDate(now);
  const origin = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const summary: ReminderRunSummary = {
    recipients: digests.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const digest of digests) {
    const classIds = digest.classes.map((item) => item.classId).sort();
    const actions = digest.classes
      .map((item) => `${item.classId}:${item.action}`)
      .sort();
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ period, classIds, actions }))
      .digest("hex");
    const delivery = await db.transaction((transaction) =>
      enqueueEmail(transaction, {
        template: CLASS_REMINDER_EMAIL_TEMPLATE,
        templateVersion: CLASS_REMINDER_EMAIL_TEMPLATE_VERSION,
        referenceType: REMINDER_REFERENCE_TYPE,
        referenceId: digest.userId,
        period,
        recipient: digest.email,
        contentFingerprint: fingerprint,
        status: EMAIL_DELIVERY_STATUSES.QUEUED,
      }),
    );
    if (delivery.status === EMAIL_DELIVERY_STATUSES.SENT) {
      summary.skipped += 1;
      continue;
    }

    const rendered = renderClassReminderEmail({
      instructorName: digest.displayName,
      classes: [...digest.classes]
        .sort(
          (a, b) =>
            a.finalSessionEndsAt.getTime() - b.finalSessionEndsAt.getTime(),
        )
        .map((item) => ({
          name: item.className,
          date: formatDepartmentDateTime(item.finalSessionEndsAt),
          url: `${origin}/staff/classes/${item.classId}/review`,
          action: item.action,
        })),
    });

    try {
      const result = await sendEmail({
        recipient: digest.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        attachments: [await loadLogoAttachment()],
      });
      await markDeliverySent(db, delivery.id, result.providerMessageId);
      summary.sent += 1;
    } catch {
      await markDeliveryFailed(db, delivery.id, "Delivery failed.");
      summary.failed += 1;
    }
  }

  return summary;
}
