import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { decryptCredential } from "@/modules/reference/crypto";
import {
  type InclusionRule,
  includesParticipant,
  resolveClassInclusionRules,
} from "@/modules/reference/inclusion";
import {
  type ClassRequirements,
  resolveClassRequirements,
} from "@/modules/student-sign-in/requirements";
import type { DatabaseTransaction } from "@/server/db/client";
import {
  attendance,
  attendanceCredentialSnapshots,
  attendanceReportingContexts,
  attendanceRequiredFieldSnapshots,
  credentialTypes,
} from "@/server/db/schema";

/**
 * The reporting inclusion for one attendance, per resolved requirement set,
 * derived from the credential snapshots it captured at sign-in. A set the
 * attendance never supplied a value for resolves through the system's inclusion
 * rule — a credential-free rule includes the attendee, a credential rule does
 * not — without inventing any value.
 */
export async function computeAttendanceSetInclusion(
  transaction: DatabaseTransaction,
  attendanceId: string,
  requirements: ClassRequirements,
  inclusionRules: InclusionRule[],
): Promise<Map<string, boolean>> {
  const snapshots = await transaction
    .select({
      requirementSetId: attendanceCredentialSnapshots.requirementSetId,
      code: credentialTypes.code,
      encryptedValue: attendanceCredentialSnapshots.encryptedValue,
    })
    .from(attendanceCredentialSnapshots)
    .innerJoin(
      credentialTypes,
      eq(credentialTypes.id, attendanceCredentialSnapshots.credentialTypeId),
    )
    .where(eq(attendanceCredentialSnapshots.attendanceId, attendanceId));

  const inclusion = new Map<string, boolean>();
  for (const set of requirements.sets) {
    const values: Record<string, string | undefined> = {};
    for (const snapshot of snapshots) {
      if (snapshot.requirementSetId !== set.id) continue;
      try {
        values[snapshot.code] = decryptCredential(snapshot.encryptedValue);
      } catch {
        // An unreadable snapshot does not confer inclusion.
      }
    }
    const rule = inclusionRules.find(
      (entry) => entry.requirementSetId === set.id,
    );
    if (!rule) throw new Error("Reporting inclusion rule is unavailable.");
    inclusion.set(set.id, includesParticipant(rule, values));
  }
  return inclusion;
}

/**
 * Bring every active attendance's reporting context into line with the class's
 * currently resolved requirement sets: insert a context for each selected
 * system an attendance is missing, and remove the context — and the snapshots
 * that reference it — for each deselected system. Removed attendance is left
 * untouched. Idempotent, so it is safe to run on every save, readiness read,
 * and finalization.
 */
export async function reconcileAttendanceReportingContexts(
  transaction: DatabaseTransaction,
  classId: string,
  now = new Date(),
): Promise<void> {
  const [requirements, inclusionRules] = await Promise.all([
    resolveClassRequirements(transaction, classId, now),
    resolveClassInclusionRules(transaction, classId, now),
  ]);

  const active = await transaction
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.classId, classId), isNull(attendance.removedAt)));
  if (active.length === 0) return;

  const activeIds = active.map((entry) => entry.id);
  const desiredSetIds = new Set(requirements.sets.map((set) => set.id));
  const existing = await transaction
    .select({
      attendanceId: attendanceReportingContexts.attendanceId,
      requirementSetId: attendanceReportingContexts.requirementSetId,
    })
    .from(attendanceReportingContexts)
    .where(inArray(attendanceReportingContexts.attendanceId, activeIds));

  const presentKeys = new Set(
    existing.map((row) => `${row.attendanceId}:${row.requirementSetId}`),
  );

  // Remove contexts for systems that are no longer selected. The snapshot
  // foreign keys are restrictive, so their rows go first.
  for (const row of existing) {
    if (desiredSetIds.has(row.requirementSetId)) continue;
    await transaction
      .delete(attendanceCredentialSnapshots)
      .where(
        and(
          eq(attendanceCredentialSnapshots.attendanceId, row.attendanceId),
          eq(
            attendanceCredentialSnapshots.requirementSetId,
            row.requirementSetId,
          ),
        ),
      );
    await transaction
      .delete(attendanceRequiredFieldSnapshots)
      .where(
        and(
          eq(attendanceRequiredFieldSnapshots.attendanceId, row.attendanceId),
          eq(
            attendanceRequiredFieldSnapshots.requirementSetId,
            row.requirementSetId,
          ),
        ),
      );
    await transaction
      .delete(attendanceReportingContexts)
      .where(
        and(
          eq(attendanceReportingContexts.attendanceId, row.attendanceId),
          eq(
            attendanceReportingContexts.requirementSetId,
            row.requirementSetId,
          ),
        ),
      );
    presentKeys.delete(`${row.attendanceId}:${row.requirementSetId}`);
  }

  // Insert a context for every resolved set an active attendance is missing.
  const values: {
    attendanceId: string;
    requirementSetId: string;
    included: boolean;
  }[] = [];
  for (const entry of active) {
    const missing = requirements.sets.filter(
      (set) => !presentKeys.has(`${entry.id}:${set.id}`),
    );
    if (missing.length === 0) continue;
    const inclusion = await computeAttendanceSetInclusion(
      transaction,
      entry.id,
      requirements,
      inclusionRules,
    );
    for (const set of missing) {
      values.push({
        attendanceId: entry.id,
        requirementSetId: set.id,
        included: inclusion.get(set.id) ?? false,
      });
    }
  }
  if (values.length > 0) {
    await transaction
      .insert(attendanceReportingContexts)
      .values(values)
      .onConflictDoNothing();
  }
}
