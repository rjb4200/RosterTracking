import "server-only";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { validateCredentialValue } from "@/modules/reference/credential-format";
import {
  credentialLookupHash,
  decryptCredential,
  encryptCredential,
} from "@/modules/reference/crypto";
import {
  includesParticipant,
  resolveClassInclusionRules,
} from "@/modules/reference/inclusion";
import { credentialMaskedSuffix } from "@/modules/reference/masking";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";
import { resolveClassRequirements } from "@/modules/student-sign-in/requirements";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  attendance,
  attendanceCredentialSnapshots,
  attendanceReportingContexts,
  classInstructors,
  credentialTypes,
  roles,
  studentCredentials,
  trainingClasses,
  userRoles,
} from "@/server/db/schema";

import { canCorrectCredentials, promptedCredentialIsValid } from "./rules";

export interface CredentialCorrectionActor {
  id: string;
  username?: string;
}

export interface CredentialCorrectionInput {
  attendanceId: string;
  credentialTypeId: string;
  value: string;
  reason: string;
}

export class CredentialCorrectionError extends Error {}

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if (
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  if ("cause" in error) {
    return postgresErrorCode((error as { cause?: unknown }).cause);
  }
  return undefined;
}

/**
 * Mirrors the class-roster access rule: an assigned instructor or elevated
 * staff member may operate the class; anyone else is denied. Kept local so the
 * student-sign-in and instructor-roster modules can depend on this service
 * without a module cycle.
 */
async function assertClassOperator(
  transaction: DatabaseTransaction,
  actorId: string,
  classId: string,
) {
  const elevated = await transaction
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, actorId), eq(roles.isActive, true)));
  if (
    elevated.some(
      (role) =>
        role.code === ROLE_CODES.ADMINISTRATOR ||
        role.code === ROLE_CODES.TRAINING_MAJOR,
    )
  ) {
    return;
  }
  const [assigned] = await transaction
    .select({ classId: classInstructors.classId })
    .from(classInstructors)
    .where(
      and(
        eq(classInstructors.classId, classId),
        eq(classInstructors.userId, actorId),
      ),
    )
    .limit(1);
  if (!assigned) {
    throw new CredentialCorrectionError("Class roster access denied.");
  }
}

/**
 * Recompute each requirement set's reporting inclusion for one attendance
 * from its current credential snapshots, so a correction is reflected without
 * touching any other attendance's facts.
 */
async function recomputeAttendanceInclusion(
  transaction: DatabaseTransaction,
  classId: string,
  attendanceId: string,
) {
  const [requirements, inclusionRules] = await Promise.all([
    resolveClassRequirements(transaction, classId),
    resolveClassInclusionRules(transaction, classId),
  ]);
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
    if (!rule) {
      throw new CredentialCorrectionError(
        "Reporting inclusion rule is unavailable.",
      );
    }
    const included = includesParticipant(rule, values);
    await transaction
      .update(attendanceReportingContexts)
      .set({ included })
      .where(
        and(
          eq(attendanceReportingContexts.attendanceId, attendanceId),
          eq(attendanceReportingContexts.requirementSetId, set.id),
        ),
      );
  }
}

export async function correctCredential(
  db: Database,
  actor: CredentialCorrectionActor,
  input: CredentialCorrectionInput,
  now = new Date(),
) {
  if (!input.reason.trim()) {
    throw new CredentialCorrectionError("A correction reason is required.");
  }
  return db.transaction(async (transaction) => {
    const [entry] = await transaction
      .select({
        id: attendance.id,
        classId: attendance.classId,
        studentId: attendance.studentId,
        removedAt: attendance.removedAt,
      })
      .from(attendance)
      .where(eq(attendance.id, input.attendanceId))
      .limit(1)
      .for("update");
    if (!entry || entry.removedAt) {
      throw new CredentialCorrectionError("Attendance was not found.");
    }
    if (!entry.studentId) {
      throw new CredentialCorrectionError(
        "Guest attendance has no student credential to correct.",
      );
    }
    const [classRecord] = await transaction
      .select({ status: trainingClasses.status })
      .from(trainingClasses)
      .where(eq(trainingClasses.id, entry.classId))
      .limit(1)
      .for("update");
    if (!classRecord) throw new CredentialCorrectionError("Class not found.");
    if (!canCorrectCredentials(classRecord.status)) {
      throw new CredentialCorrectionError(
        "Credentials cannot be corrected for this class.",
      );
    }
    // An assigned instructor may correct only their own class; elevated staff
    // (Administrator, Training Major) may correct any class.
    await assertClassOperator(transaction, actor.id, entry.classId);

    const requirements = await resolveClassRequirements(
      transaction,
      entry.classId,
      now,
    );
    const prompted = requirements.credentials.find(
      (credential) => credential.id === input.credentialTypeId,
    );
    if (!prompted) {
      throw new CredentialCorrectionError(
        "That credential is not prompted by this class.",
      );
    }
    const [type] = await transaction
      .select({
        code: credentialTypes.code,
        valuePattern: credentialTypes.valuePattern,
      })
      .from(credentialTypes)
      .where(
        and(
          eq(credentialTypes.id, input.credentialTypeId),
          eq(credentialTypes.isActive, true),
        ),
      )
      .limit(1);
    if (!type)
      throw new CredentialCorrectionError("Credential type is unavailable.");
    const normalized = validateCredentialValue(input.value, type);
    const maskedSuffix = credentialMaskedSuffix(normalized);
    const valueHash = credentialLookupHash(normalized);
    const encryptedValue = encryptCredential(normalized);

    const [existing] = await transaction
      .select({
        id: studentCredentials.id,
        maskedSuffix: studentCredentials.maskedSuffix,
      })
      .from(studentCredentials)
      .where(
        and(
          eq(studentCredentials.studentId, entry.studentId),
          eq(studentCredentials.credentialTypeId, input.credentialTypeId),
        ),
      )
      .limit(1)
      .for("update");
    const previousMaskedSuffix = existing?.maskedSuffix ?? null;
    try {
      if (existing) {
        await transaction
          .update(studentCredentials)
          .set({
            value: encryptedValue,
            valueHash,
            maskedSuffix,
            updatedAt: now,
          })
          .where(eq(studentCredentials.id, existing.id));
      } else {
        await transaction.insert(studentCredentials).values({
          studentId: entry.studentId,
          credentialTypeId: input.credentialTypeId,
          value: encryptedValue,
          valueHash,
          maskedSuffix,
        });
      }
    } catch (error) {
      if (postgresErrorCode(error) === "23505") {
        throw new CredentialCorrectionError(
          "This credential number is already in use.",
        );
      }
      throw error;
    }

    for (const set of requirements.sets) {
      if (
        !set.credentials.some(
          (credential) => credential.id === input.credentialTypeId,
        )
      ) {
        continue;
      }
      const [snapshot] = await transaction
        .select({ id: attendanceCredentialSnapshots.id })
        .from(attendanceCredentialSnapshots)
        .where(
          and(
            eq(attendanceCredentialSnapshots.attendanceId, entry.id),
            eq(attendanceCredentialSnapshots.requirementSetId, set.id),
            eq(
              attendanceCredentialSnapshots.credentialTypeId,
              input.credentialTypeId,
            ),
          ),
        )
        .limit(1)
        .for("update");
      if (snapshot) {
        await transaction
          .update(attendanceCredentialSnapshots)
          .set({ encryptedValue, maskedSuffix })
          .where(eq(attendanceCredentialSnapshots.id, snapshot.id));
      } else {
        await transaction.insert(attendanceCredentialSnapshots).values({
          attendanceId: entry.id,
          requirementSetId: set.id,
          credentialTypeId: input.credentialTypeId,
          encryptedValue,
          maskedSuffix,
        });
      }
    }

    await recomputeAttendanceInclusion(transaction, entry.classId, entry.id);

    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "student.credential.corrected_from_roster",
      entityType: "student",
      entityId: entry.studentId,
      details: {
        classId: entry.classId,
        attendanceId: entry.id,
        credentialTypeId: input.credentialTypeId,
        reason: input.reason.trim(),
        previousMaskedSuffix,
        maskedSuffix,
      },
    });

    return {
      attendanceId: entry.id,
      credentialTypeId: input.credentialTypeId,
      maskedSuffix,
    };
  });
}

export interface PromptedCredentialCorrection {
  credentialTypeId: string;
  code: string;
  name: string;
  currentValue: string;
  valid: boolean;
}

/**
 * The prompted credentials for every student attendance in a class, keyed by
 * attendance id, for a roster correction surface. Guest attendance is omitted
 * because it has no student credential to correct.
 */
export async function listClassCredentialCorrections(
  db: Database | DatabaseTransaction,
  classId: string,
): Promise<Map<string, PromptedCredentialCorrection[]>> {
  const result = new Map<string, PromptedCredentialCorrection[]>();
  const requirements = await resolveClassRequirements(db, classId);
  if (requirements.credentials.length === 0) return result;
  const typeIds = requirements.credentials.map((credential) => credential.id);
  const attendanceRows = await db
    .select({ attendanceId: attendance.id, studentId: attendance.studentId })
    .from(attendance)
    .where(
      and(eq(attendance.classId, classId), isNotNull(attendance.studentId)),
    );
  if (attendanceRows.length === 0) return result;
  const studentIds = attendanceRows.flatMap((row) =>
    row.studentId ? [row.studentId] : [],
  );
  const [types, stored] = await Promise.all([
    db
      .select({
        id: credentialTypes.id,
        name: credentialTypes.name,
        valuePattern: credentialTypes.valuePattern,
      })
      .from(credentialTypes)
      .where(inArray(credentialTypes.id, typeIds)),
    db
      .select({
        studentId: studentCredentials.studentId,
        credentialTypeId: studentCredentials.credentialTypeId,
        encryptedValue: studentCredentials.value,
      })
      .from(studentCredentials)
      .where(
        and(
          inArray(studentCredentials.studentId, studentIds),
          inArray(studentCredentials.credentialTypeId, typeIds),
        ),
      ),
  ]);
  for (const row of attendanceRows) {
    result.set(
      row.attendanceId,
      requirements.credentials.map((credential) => {
        const type = types.find((value) => value.id === credential.id);
        const storedRow = stored.find(
          (value) =>
            value.studentId === row.studentId &&
            value.credentialTypeId === credential.id,
        );
        let currentValue = "";
        if (storedRow?.encryptedValue) {
          try {
            currentValue = decryptCredential(storedRow.encryptedValue);
          } catch {
            currentValue = "";
          }
        }
        return {
          credentialTypeId: credential.id,
          code: credential.code,
          name: type?.name ?? credential.code.toUpperCase(),
          currentValue,
          valid: promptedCredentialIsValid(
            {
              code: credential.code,
              valuePattern: type?.valuePattern ?? null,
            },
            currentValue,
          ),
        };
      }),
    );
  }
  return result;
}

/**
 * The credentials a class prompts for one attendance, with their current stored
 * value decrypted for the correction surface and a valid flag. A guest or an
 * absent value returns an empty value rather than failing.
 */
export async function listPromptedCredentialCorrections(
  db: Database | DatabaseTransaction,
  classId: string,
  attendanceId: string,
): Promise<PromptedCredentialCorrection[]> {
  const [entry] = await db
    .select({ studentId: attendance.studentId })
    .from(attendance)
    .where(eq(attendance.id, attendanceId))
    .limit(1);
  const requirements = await resolveClassRequirements(db, classId);
  if (requirements.credentials.length === 0) return [];
  const types = await db
    .select({
      id: credentialTypes.id,
      code: credentialTypes.code,
      name: credentialTypes.name,
      valuePattern: credentialTypes.valuePattern,
    })
    .from(credentialTypes)
    .where(
      inArray(
        credentialTypes.id,
        requirements.credentials.map((credential) => credential.id),
      ),
    );
  const stored = entry?.studentId
    ? await db
        .select({
          credentialTypeId: studentCredentials.credentialTypeId,
          encryptedValue: studentCredentials.value,
        })
        .from(studentCredentials)
        .where(eq(studentCredentials.studentId, entry.studentId))
    : [];
  return requirements.credentials.map((credential) => {
    const type = types.find((value) => value.id === credential.id);
    const row = stored.find(
      (value) => value.credentialTypeId === credential.id,
    );
    let currentValue = "";
    if (row?.encryptedValue) {
      try {
        currentValue = decryptCredential(row.encryptedValue);
      } catch {
        currentValue = "";
      }
    }
    return {
      credentialTypeId: credential.id,
      code: credential.code,
      name: type?.name ?? credential.code.toUpperCase(),
      currentValue,
      valid: promptedCredentialIsValid(
        {
          code: credential.code,
          valuePattern: type?.valuePattern ?? null,
        },
        currentValue,
      ),
    };
  });
}
