/**
 * Pure reminder-domain rules: the overdue threshold, the signing-instructor
 * audience, and grouping overdue classes by recipient. Kept free of database
 * and server imports so the rules stay unit-testable.
 */

export const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;

export type ReminderAction = "finalize" | "sign_fire";

export interface ReminderInstructor {
  userId: string;
  isLead: boolean;
}

export interface ReminderClass {
  classId: string;
  className: string;
  finalSessionEndsAt: Date;
  instructors: readonly ReminderInstructor[];
  // A pending Fire signature is attributed directly to its signer; an open
  // class is attributed to its lead.
  recipientUserId?: string;
  action?: ReminderAction;
}

export interface ReminderAccount {
  userId: string;
  email: string | null;
  isActive: boolean;
  displayName: string;
}

export interface ReminderDigestClass {
  classId: string;
  className: string;
  finalSessionEndsAt: Date;
  action: ReminderAction;
}

export interface ReminderDigest {
  userId: string;
  email: string;
  displayName: string;
  classes: ReminderDigestClass[];
}

/** True when a class's final scheduled session ended more than 24 hours ago. */
export function isReminderDue(
  finalSessionEndsAt: Date | null,
  now: Date,
): boolean {
  return (
    finalSessionEndsAt !== null &&
    now.getTime() > finalSessionEndsAt.getTime() + REMINDER_DELAY_MS
  );
}

/**
 * The signing instructor for a class. Today that is the lead; when the
 * assistant-instructor rules land this is where the fire-instructor resolver
 * will live. Falls back to the first assigned instructor when no lead resolves.
 */
export function resolveSigningInstructor(
  instructors: readonly ReminderInstructor[],
): ReminderInstructor | null {
  return (
    instructors.find((instructor) => instructor.isLead) ??
    instructors[0] ??
    null
  );
}

/**
 * Groups overdue classes into one digest per deliverable recipient. A class is
 * attributed to its signing instructor; a recipient with no email or an
 * inactive account is skipped.
 */
export function groupReminders(
  classes: readonly ReminderClass[],
  accounts: ReadonlyMap<string, ReminderAccount>,
): ReminderDigest[] {
  const byRecipient = new Map<string, ReminderDigest>();
  for (const classRecord of classes) {
    const recipientUserId =
      classRecord.recipientUserId ??
      resolveSigningInstructor(classRecord.instructors)?.userId;
    if (!recipientUserId) continue;
    const account = accounts.get(recipientUserId);
    if (!account?.isActive || !account.email) continue;
    let digest = byRecipient.get(account.userId);
    if (!digest) {
      digest = {
        userId: account.userId,
        email: account.email,
        displayName: account.displayName,
        classes: [],
      };
      byRecipient.set(account.userId, digest);
    }
    digest.classes.push({
      classId: classRecord.classId,
      className: classRecord.className,
      finalSessionEndsAt: classRecord.finalSessionEndsAt,
      action: classRecord.action ?? "finalize",
    });
  }
  return [...byRecipient.values()];
}
