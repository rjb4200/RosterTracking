import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { CLASS_STATUSES } from "@/modules/classes/constants";
import { encryptCredential } from "@/modules/reference/crypto";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  attendance,
  attendanceAttestations,
  attendanceCredentialSnapshots,
  attendanceReportingContexts,
  attendanceRequiredFieldSnapshots,
  classComponents,
  classGuests,
  classInstructors,
  roles,
  studentAgencies,
  students,
  trainingClasses,
  userRoles,
  users,
} from "@/server/db/schema";
import { ROLE_CODES } from "../staff-auth/permissions";
import {
  ATTENDANCE_ATTESTATION_VERSION,
  renderAttendanceAttestation,
} from "../student-sign-in/attendance";
import {
  protectedCredentialValue,
  studentFieldValue,
} from "../student-sign-in/participants";
import {
  type ClassRequirements,
  getRegularRequirementValues,
  resolveClassRequirements,
} from "../student-sign-in/requirements";

export interface RosterActor {
  id: string;
  username: string;
}

export { CREDIT_ADJUSTMENT_REASONS } from "./constants";

export function hasElevatedRosterAccess(roleCodes: string[]): boolean {
  return roleCodes.some(
    (code) =>
      code === ROLE_CODES.ADMINISTRATOR || code === ROLE_CODES.TRAINING_MAJOR,
  );
}

const rosterInput = z.object({
  classId: z.string().uuid(),
  agencyId: z.string().uuid(),
  fields: z.record(z.string(), z.string()).default({}),
  credentials: z.record(z.string().uuid(), z.string()).default({}),
});

export function validateCreditedHours(
  creditedHours: number,
  scheduledHours: number,
  reason?: string,
): void {
  if (
    !Number.isFinite(creditedHours) ||
    creditedHours < 0 ||
    creditedHours > scheduledHours
  ) {
    throw new Error(
      "Credited hours must be between zero and the scheduled total.",
    );
  }
  if (creditedHours !== scheduledHours && !reason?.trim()) {
    throw new Error(
      "A reason is required when credited hours differ from scheduled hours.",
    );
  }
}

export async function getScheduledClassHours(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<number> {
  const [row] = await transaction
    .select({
      hours: sql<string>`coalesce(sum(${classComponents.creditedHours}), 0)`,
    })
    .from(classComponents)
    .where(eq(classComponents.classId, classId));
  const hours = Number(row?.hours ?? 0);
  if (!Number.isFinite(hours) || hours <= 0)
    throw new Error("Class schedule is unavailable.");
  return hours;
}

async function requireAssignedInstructor(
  transaction: DatabaseTransaction,
  actor: RosterActor,
  classId: string,
  lock = true,
) {
  const elevated = await transaction
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(userRoles.userId, actor.id),
        eq(roles.isActive, true),
        sql`${roles.code} in (${ROLE_CODES.ADMINISTRATOR}, ${ROLE_CODES.TRAINING_MAJOR})`,
      ),
    )
    .limit(1);
  if (hasElevatedRosterAccess(elevated.map((role) => role.code))) {
    const [classRecord] = await transaction
      .select()
      .from(trainingClasses)
      .where(eq(trainingClasses.id, classId))
      .limit(1);
    if (classRecord) return classRecord;
  }
  const query = transaction
    .select()
    .from(trainingClasses)
    .innerJoin(
      classInstructors,
      and(
        eq(classInstructors.classId, trainingClasses.id),
        eq(classInstructors.userId, actor.id),
      ),
    )
    .where(eq(trainingClasses.id, classId))
    .limit(1);
  const [row] = lock ? await query.for("update") : await query;
  if (!row) throw new Error("Roster unavailable.");
  return row.classes;
}

function requireMutableRosterClass(classRecord: { status: string }) {
  if (
    ![CLASS_STATUSES.OPEN, CLASS_STATUSES.COMPLETED].includes(
      classRecord.status as typeof CLASS_STATUSES.OPEN,
    )
  ) {
    throw new Error(
      "Attendance can only be changed while the class is open or under completed review.",
    );
  }
}

function manualMetadata(actor: RosterActor) {
  return {
    originatingIp: "staff",
    requestSourceFingerprint: `staff:${actor.id}`,
    requestCorrelationId: `manual:${crypto.randomUUID()}`,
  };
}

async function insertSnapshots(
  transaction: DatabaseTransaction,
  attendanceId: string,
  requirements: ClassRequirements,
  fields: Record<string, string>,
  credentialValues: Map<string, string>,
) {
  if (requirements.sets.length) {
    await transaction.insert(attendanceReportingContexts).values(
      requirements.sets.map((set) => ({
        attendanceId,
        requirementSetId: set.id,
      })),
    );
  }
  const fieldSnapshots = requirements.sets.flatMap((set) =>
    set.studentFields.map((studentField) => ({
      attendanceId,
      requirementSetId: set.id,
      studentField,
      encryptedValue: encryptCredential(fields[studentField] ?? ""),
    })),
  );
  if (fieldSnapshots.length)
    await transaction
      .insert(attendanceRequiredFieldSnapshots)
      .values(fieldSnapshots);
  const credentialSnapshots = requirements.sets.flatMap((set) =>
    set.credentials.map((credential) => {
      const value = credentialValues.get(credential.id);
      if (!value) throw new Error("Required roster data is missing.");
      const protectedValue = protectedCredentialValue(value);
      return {
        attendanceId,
        requirementSetId: set.id,
        credentialTypeId: credential.id,
        encryptedValue: protectedValue.encryptedValue,
        maskedSuffix: protectedValue.maskedSuffix,
      };
    }),
  );
  if (credentialSnapshots.length)
    await transaction
      .insert(attendanceCredentialSnapshots)
      .values(credentialSnapshots);
}

function suppliedValue(values: Record<string, string>, key: string) {
  const value = values[key]?.trim();
  return value || null;
}

async function requireRegularAgency(
  transaction: DatabaseTransaction,
  studentId: string,
  agencyId: string,
) {
  const [membership] = await transaction
    .select({ id: agencies.id })
    .from(studentAgencies)
    .innerJoin(agencies, eq(agencies.id, studentAgencies.agencyId))
    .where(
      and(
        eq(studentAgencies.studentId, studentId),
        eq(studentAgencies.agencyId, agencyId),
        eq(studentAgencies.isActive, true),
        eq(agencies.isActive, true),
      ),
    )
    .limit(1)
    .for("share");
  if (!membership) throw new Error("Select an active agency for this student.");
}

async function requireGuestAgency(
  transaction: DatabaseTransaction,
  agencyId: string,
) {
  const [agency] = await transaction
    .select({ id: agencies.id })
    .from(agencies)
    .where(and(eq(agencies.id, agencyId), eq(agencies.isActive, true)))
    .limit(1)
    .for("share");
  if (!agency) throw new Error("Select an active agency.");
}

async function createManualAttendance(
  transaction: DatabaseTransaction,
  input: {
    classId: string;
    agencyId: string;
    studentId: string | null;
    guestId: string | null;
    name: string;
    fields: Record<string, string>;
    credentials: Map<string, string>;
    actor: RosterActor;
    participantKind: "regular" | "guest";
  },
  requirements: ClassRequirements,
  scheduledHours: number,
  now: Date,
) {
  const [created] = await transaction
    .insert(attendance)
    .values({
      classId: input.classId,
      agencyId: input.agencyId,
      studentId: input.studentId,
      guestId: input.guestId,
      idempotencyKey: `manual:${crypto.randomUUID()}`,
      payloadFingerprint: `manual:${crypto.randomUUID()}`,
      signedInAt: now,
      creditedHours: String(scheduledHours),
      isManual: true,
      manualRecordedByUserId: input.actor.id,
    })
    .returning({ id: attendance.id });
  if (!created) throw new Error("Attendance was not created.");
  await transaction.insert(attendanceAttestations).values({
    attendanceId: created.id,
    renderedText: renderAttendanceAttestation(input.name),
    textVersion: ATTENDANCE_ATTESTATION_VERSION,
    confirmedAt: now,
    signInMethod: `manual_${input.participantKind}`,
    ...manualMetadata(input.actor),
  });
  await insertSnapshots(
    transaction,
    created.id,
    requirements,
    input.fields,
    input.credentials,
  );
  await writeAuditLog(transaction, {
    actorUserId: input.actor.id,
    actorType: "user",
    action: "attendance.manual_added",
    entityType: "attendance",
    entityId: created.id,
    details: {
      classId: input.classId,
      participantKind: input.participantKind,
      agencyId: input.agencyId,
    },
  });
  return created.id;
}

export async function addManualRegularAttendance(
  db: Database,
  actor: RosterActor,
  input: z.input<typeof rosterInput> & { studentId: string },
  now = new Date(),
) {
  const parsed = rosterInput
    .extend({ studentId: z.string().uuid() })
    .parse(input);
  return db.transaction(async (transaction) => {
    const classRecord = await requireAssignedInstructor(
      transaction,
      actor,
      parsed.classId,
    );
    requireMutableRosterClass(classRecord);
    await requireRegularAgency(transaction, parsed.studentId, parsed.agencyId);
    const [duplicate] = await transaction
      .select({ id: attendance.id })
      .from(attendance)
      .where(
        and(
          eq(attendance.classId, parsed.classId),
          eq(attendance.studentId, parsed.studentId),
          isNull(attendance.removedAt),
        ),
      )
      .limit(1)
      .for("update");
    if (duplicate)
      throw new Error("This student already has active attendance.");
    const requirements = await resolveClassRequirements(
      transaction,
      parsed.classId,
      now,
    );
    const loaded = await getRegularRequirementValues(
      transaction,
      parsed.studentId,
      requirements,
    );
    if (!loaded) throw new Error("Select an active student.");
    const fields: Record<string, string> = {};
    for (const field of requirements.studentFields) {
      const value =
        studentFieldValue(loaded.student, field) ??
        suppliedValue(parsed.fields, field);
      if (!value) throw new Error("Required roster data is missing.");
      fields[field] = value;
    }
    const credentials = new Map(loaded.credentials);
    for (const credential of requirements.credentials) {
      const value =
        credentials.get(credential.id) ??
        suppliedValue(parsed.credentials, credential.id);
      if (!value) throw new Error("Required roster data is missing.");
      credentials.set(credential.id, value);
    }
    return createManualAttendance(
      transaction,
      {
        classId: parsed.classId,
        agencyId: parsed.agencyId,
        studentId: parsed.studentId,
        guestId: null,
        name: `${loaded.student.firstName} ${loaded.student.lastName}`,
        fields,
        credentials,
        actor,
        participantKind: "regular",
      },
      requirements,
      await getScheduledClassHours(transaction, parsed.classId),
      now,
    );
  });
}

export async function addManualGuestAttendance(
  db: Database,
  actor: RosterActor,
  input: z.input<typeof rosterInput> & { firstName: string; lastName: string },
  now = new Date(),
) {
  const parsed = rosterInput
    .extend({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
    })
    .parse(input);
  return db.transaction(async (transaction) => {
    const classRecord = await requireAssignedInstructor(
      transaction,
      actor,
      parsed.classId,
    );
    requireMutableRosterClass(classRecord);
    await requireGuestAgency(transaction, parsed.agencyId);
    const requirements = await resolveClassRequirements(
      transaction,
      parsed.classId,
      now,
    );
    const fields: Record<string, string> = {};
    for (const field of requirements.studentFields) {
      const value = suppliedValue(parsed.fields, field);
      if (!value) throw new Error("Required roster data is missing.");
      fields[field] = value;
    }
    const credentials = new Map<string, string>();
    for (const credential of requirements.credentials) {
      const value = suppliedValue(parsed.credentials, credential.id);
      if (!value) throw new Error("Required roster data is missing.");
      credentials.set(credential.id, value);
    }
    const [guest] = await transaction
      .insert(classGuests)
      .values({
        classId: parsed.classId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
      })
      .returning({ id: classGuests.id });
    if (!guest) throw new Error("Guest was not created.");
    return createManualAttendance(
      transaction,
      {
        classId: parsed.classId,
        agencyId: parsed.agencyId,
        studentId: null,
        guestId: guest.id,
        name: `${parsed.firstName} ${parsed.lastName}`,
        fields,
        credentials,
        actor,
        participantKind: "guest",
      },
      requirements,
      await getScheduledClassHours(transaction, parsed.classId),
      now,
    );
  });
}

export async function removeAttendance(
  db: Database,
  actor: RosterActor,
  attendanceId: string,
  reason: string,
  now = new Date(),
) {
  if (!reason.trim()) throw new Error("A removal reason is required.");
  return db.transaction(async (transaction) => {
    const [entry] = await transaction
      .select({ id: attendance.id, classId: attendance.classId })
      .from(attendance)
      .where(and(eq(attendance.id, attendanceId), isNull(attendance.removedAt)))
      .limit(1)
      .for("update");
    if (!entry) throw new Error("Active attendance was not found.");
    requireMutableRosterClass(
      await requireAssignedInstructor(transaction, actor, entry.classId),
    );
    await transaction
      .update(attendance)
      .set({
        removedAt: now,
        removedByUserId: actor.id,
        removalReason: reason.trim(),
      })
      .where(eq(attendance.id, entry.id));
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "attendance.removed",
      entityType: "attendance",
      entityId: entry.id,
      details: { classId: entry.classId, reason: reason.trim() },
    });
  });
}

export async function adjustCreditedHours(
  db: Database,
  actor: RosterActor,
  attendanceId: string,
  creditedHours: number,
  reason?: string,
  now = new Date(),
) {
  return db.transaction(async (transaction) => {
    const [entry] = await transaction
      .select({ id: attendance.id, classId: attendance.classId })
      .from(attendance)
      .where(and(eq(attendance.id, attendanceId), isNull(attendance.removedAt)))
      .limit(1)
      .for("update");
    if (!entry) throw new Error("Active attendance was not found.");
    requireMutableRosterClass(
      await requireAssignedInstructor(transaction, actor, entry.classId),
    );
    const scheduledHours = await getScheduledClassHours(
      transaction,
      entry.classId,
    );
    validateCreditedHours(creditedHours, scheduledHours, reason);
    const changed = creditedHours !== scheduledHours;
    await transaction
      .update(attendance)
      .set({
        creditedHours: String(creditedHours),
        creditAdjustmentReason: changed ? reason?.trim() : null,
        creditAdjustedByUserId: changed ? actor.id : null,
        creditAdjustedAt: changed ? now : null,
      })
      .where(eq(attendance.id, entry.id));
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "attendance.credit_adjusted",
      entityType: "attendance",
      entityId: entry.id,
      details: {
        classId: entry.classId,
        creditedHours,
        reason: changed ? reason?.trim() : undefined,
      },
    });
  });
}

export async function validateRosterCompletion(
  transaction: DatabaseTransaction,
  classId: string,
) {
  const scheduledHours = await getScheduledClassHours(transaction, classId);
  const requirements = await resolveClassRequirements(transaction, classId);
  const active = await transaction
    .select({ id: attendance.id, creditedHours: attendance.creditedHours })
    .from(attendance)
    .where(and(eq(attendance.classId, classId), isNull(attendance.removedAt)))
    .for("update");
  if (!active.length)
    throw new Error(
      "Add at least one active attendance record before completing.",
    );
  for (const entry of active) {
    const credit =
      entry.creditedHours === null ? Number.NaN : Number(entry.creditedHours);
    if (!Number.isFinite(credit) || credit < 0 || credit > scheduledHours)
      throw new Error("Active attendance has invalid credited hours.");
    const contexts = await transaction
      .select({
        requirementSetId: attendanceReportingContexts.requirementSetId,
      })
      .from(attendanceReportingContexts)
      .where(eq(attendanceReportingContexts.attendanceId, entry.id));
    if (contexts.length !== requirements.sets.length)
      throw new Error(
        "Active attendance is missing required reporting context.",
      );
  }
}

export async function getRosterReadiness(
  db: Database,
  actor: RosterActor,
  classId: string,
) {
  return db.transaction(async (transaction) => {
    const classRecord = await requireAssignedInstructor(
      transaction,
      actor,
      classId,
      false,
    );
    if (
      ![CLASS_STATUSES.OPEN, CLASS_STATUSES.COMPLETED].includes(
        classRecord.status as typeof CLASS_STATUSES.OPEN,
      )
    )
      throw new Error("Roster unavailable.");

    const scheduledHours = await getScheduledClassHours(transaction, classId);
    const requirements = await resolveClassRequirements(transaction, classId);
    const active = await transaction
      .select({ id: attendance.id, creditedHours: attendance.creditedHours })
      .from(attendance)
      .where(
        and(eq(attendance.classId, classId), isNull(attendance.removedAt)),
      );
    const issues: string[] = [];
    if (!active.length)
      issues.push("Add at least one active attendance record.");
    for (const entry of active) {
      const credit =
        entry.creditedHours === null ? Number.NaN : Number(entry.creditedHours);
      if (!Number.isFinite(credit) || credit < 0 || credit > scheduledHours)
        issues.push(`Attendance ${entry.id} has invalid credited hours.`);
      const contexts = await transaction
        .select({
          requirementSetId: attendanceReportingContexts.requirementSetId,
        })
        .from(attendanceReportingContexts)
        .where(eq(attendanceReportingContexts.attendanceId, entry.id));
      if (contexts.length !== requirements.sets.length)
        issues.push(
          `Attendance ${entry.id} is missing required reporting context.`,
        );
    }
    return { ready: issues.length === 0, issues, scheduledHours };
  });
}

export async function getClassRoster(
  db: Database,
  actor: RosterActor,
  classId: string,
) {
  return db.transaction(async (transaction) => {
    const classRecord = await requireAssignedInstructor(
      transaction,
      actor,
      classId,
      false,
    );
    if (
      ![CLASS_STATUSES.OPEN, CLASS_STATUSES.COMPLETED].includes(
        classRecord.status as typeof CLASS_STATUSES.OPEN,
      )
    )
      throw new Error("Roster unavailable.");
    const rows = await transaction
      .select({
        id: attendance.id,
        studentId: attendance.studentId,
        guestId: attendance.guestId,
        signedInAt: attendance.signedInAt,
        creditedHours: attendance.creditedHours,
        isManual: attendance.isManual,
        removedAt: attendance.removedAt,
        removalReason: attendance.removalReason,
        firstName: students.firstName,
        lastName: students.lastName,
        guestFirstName: classGuests.firstName,
        guestLastName: classGuests.lastName,
        agencyName: agencies.name,
        signInMethod: attendanceAttestations.signInMethod,
        removedBy: users.displayName,
      })
      .from(attendance)
      .innerJoin(agencies, eq(agencies.id, attendance.agencyId))
      .leftJoin(students, eq(students.id, attendance.studentId))
      .leftJoin(classGuests, eq(classGuests.id, attendance.guestId))
      .leftJoin(
        attendanceAttestations,
        eq(attendanceAttestations.attendanceId, attendance.id),
      )
      .leftJoin(users, eq(users.id, attendance.removedByUserId))
      .where(eq(attendance.classId, classId))
      .orderBy(asc(attendance.signedInAt));
    const map = (row: (typeof rows)[number]) => ({
      ...row,
      participantType: row.studentId ? "regular" : "guest",
      name: row.studentId
        ? `${row.firstName} ${row.lastName}`
        : `${row.guestFirstName} ${row.guestLastName}`,
    });
    return {
      classRecord,
      scheduledHours: await getScheduledClassHours(transaction, classId),
      active: rows.filter((row) => !row.removedAt).map(map),
      removed: rows.filter((row) => row.removedAt).map(map),
    };
  });
}

export async function listRosterFormOptions(db: Database) {
  const [studentsRows, agencyRows] = await Promise.all([
    db
      .select({
        id: students.id,
        name: sql<string>`${students.lastName} || ', ' || ${students.firstName}`,
      })
      .from(students)
      .where(eq(students.isActive, true))
      .orderBy(asc(students.lastName), asc(students.firstName)),
    db
      .select({ id: agencies.id, name: agencies.name })
      .from(agencies)
      .where(eq(agencies.isActive, true))
      .orderBy(asc(agencies.name)),
  ]);
  return { students: studentsRows, agencies: agencyRows };
}
