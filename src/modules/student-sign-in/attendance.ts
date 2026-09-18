import "server-only";

import { and, eq, gt, isNull, sql } from "drizzle-orm";

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
  rememberedDevices,
  signInWorkflowStaging,
  studentCredentials,
  students,
  trainingClasses,
} from "@/server/db/schema";

import { hashWorkflowNonce, validateSignInContext } from "./context";
import { keyedHash } from "./crypto";
import { protectedCredentialValue, studentFieldValue } from "./participants";
import {
  createRememberedDeviceInTransaction,
  REMEMBERED_DEVICE_TTL_SECONDS,
} from "./remembered-device";
import {
  type ClassRequirements,
  getRegularRequirementValues,
  resolveClassRequirements,
} from "./requirements";
import type {
  GuestWorkflowParticipant,
  RegularWorkflowParticipant,
  SignInWorkflowState,
} from "./types";
import {
  decodeSignInWorkflowState,
  InvalidSignInWorkflowError,
} from "./workflow";

export const ATTENDANCE_ATTESTATION_VERSION = 1;

export class AttendanceConfirmationError extends Error {}
export class ChangedIdempotencyPayloadError extends AttendanceConfirmationError {}
export class RecoveryRestartRequiredError extends AttendanceConfirmationError {}

export interface AttendanceRequestMetadata {
  ipAddress: string;
  requestSourceFingerprint: string;
  requestCorrelationId: string;
}

export interface AttendanceConfirmationResult {
  attendanceId: string;
  status: "created" | "idempotent" | "already_signed_in";
  rememberedDevice?: {
    id: string;
    token?: string;
    expiresAt: Date;
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function attendancePayloadFingerprint(input: {
  classId: string;
  tokenVersion: number;
  idempotencyKey: string;
  state: SignInWorkflowState;
  attestationConfirmed: boolean;
  rememberDevice: boolean;
  attestationVersion?: number;
}): string {
  return keyedHash(
    "attendance-confirmation-payload",
    JSON.stringify(
      canonicalize({
        ...input,
        attestationVersion:
          input.attestationVersion ?? ATTENDANCE_ATTESTATION_VERSION,
      }),
    ),
  );
}

export function renderAttendanceAttestation(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Participant name is required.");
  return `I confirm that I am ${normalized} and attended this class.`;
}

function postgresError(error: unknown): { code?: string; constraint?: string } {
  if (typeof error !== "object" || error === null) return {};
  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    cause?: unknown;
  };
  if (typeof candidate.code === "string") {
    return {
      code: candidate.code,
      constraint:
        typeof candidate.constraint === "string"
          ? candidate.constraint
          : undefined,
    };
  }
  if ("cause" in candidate) return postgresError(candidate.cause);
  return {};
}

function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const parsed = postgresError(error);
  return (
    parsed.code === "23505" && (!constraint || parsed.constraint === constraint)
  );
}

async function requireRegularAgency(
  transaction: DatabaseTransaction,
  agencyId: string,
) {
  const [agency] = await transaction
    .select({ id: agencies.id })
    .from(agencies)
    .where(and(eq(agencies.id, agencyId), eq(agencies.isActive, true)))
    .limit(1)
    .for("share");
  if (!agency) throw new AttendanceConfirmationError("Attendance unavailable.");
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
  if (!agency) throw new AttendanceConfirmationError("Attendance unavailable.");
}

function stagedCredentialMap(
  participant: RegularWorkflowParticipant | GuestWorkflowParticipant,
) {
  return new Map(
    participant.credentials.map((credential) => [
      credential.credentialTypeId,
      credential,
    ]),
  );
}

async function prepareRegularFacts(
  transaction: DatabaseTransaction,
  participant: RegularWorkflowParticipant,
  requirements: ClassRequirements,
  now: Date,
) {
  if (!participant.profileConfirmed) {
    throw new AttendanceConfirmationError("Profile confirmation is required.");
  }
  const loaded = await getRegularRequirementValues(
    transaction,
    participant.studentId,
    requirements,
  );
  if (!loaded) throw new AttendanceConfirmationError("Attendance unavailable.");
  const fields: Record<string, string> = {};
  const studentUpdates: {
    email?: string;
    studentNumber?: string;
    phone?: string;
    updatedAt: Date;
  } = {
    updatedAt: now,
  };
  for (const field of requirements.studentFields) {
    const existing = studentFieldValue(loaded.student, field);
    const staged = participant.fields[field];
    if (existing && staged) {
      throw new AttendanceConfirmationError(
        "Existing values cannot be replaced.",
      );
    }
    const value = existing ?? staged;
    if (!value)
      throw new AttendanceConfirmationError("Required data is missing.");
    fields[field] = value;
    if (!existing) {
      if (field === "email") studentUpdates.email = value;
      else if (field === "studentNumber") studentUpdates.studentNumber = value;
      else
        throw new AttendanceConfirmationError(
          "Required field cannot be added publicly.",
        );
    }
  }
  if (participant.replacementPhone) {
    if (participant.signInMethod !== "recovery") {
      throw new AttendanceConfirmationError(
        "Phone replacement is unavailable.",
      );
    }
    studentUpdates.phone = participant.replacementPhone;
  }

  const staged = stagedCredentialMap(participant);
  const credentialValues = new Map(loaded.credentials);
  for (const credential of requirements.credentials) {
    const existing = credentialValues.get(credential.id);
    const addition = staged.get(credential.id);
    if (existing && addition) {
      throw new AttendanceConfirmationError(
        "Existing credentials cannot be replaced.",
      );
    }
    if (!existing && !addition) {
      throw new AttendanceConfirmationError("Required data is missing.");
    }
    if (addition) credentialValues.set(credential.id, addition.value);
  }
  return { loaded, fields, studentUpdates, credentialValues };
}

function prepareGuestFacts(
  participant: GuestWorkflowParticipant,
  requirements: ClassRequirements,
) {
  const fields: Record<string, string> = {};
  for (const field of requirements.studentFields) {
    const value = participant.fields[field];
    if (!value)
      throw new AttendanceConfirmationError("Required data is missing.");
    fields[field] = value;
  }
  const staged = stagedCredentialMap(participant);
  const credentialValues = new Map<string, string>();
  for (const credential of requirements.credentials) {
    const value = staged.get(credential.id)?.value;
    if (!value)
      throw new AttendanceConfirmationError("Required data is missing.");
    credentialValues.set(credential.id, value);
  }
  return { fields, credentialValues };
}

async function insertReportingSnapshots(
  transaction: DatabaseTransaction,
  attendanceId: string,
  requirements: ClassRequirements,
  fields: Record<string, string>,
  credentialValues: Map<string, string>,
) {
  if (requirements.sets.length > 0) {
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
  if (fieldSnapshots.length > 0) {
    await transaction
      .insert(attendanceRequiredFieldSnapshots)
      .values(fieldSnapshots);
  }
  const credentialSnapshots = requirements.sets.flatMap((set) =>
    set.credentials.map((credential) => {
      const value = credentialValues.get(credential.id);
      if (!value)
        throw new AttendanceConfirmationError("Required data is missing.");
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
  if (credentialSnapshots.length > 0) {
    await transaction
      .insert(attendanceCredentialSnapshots)
      .values(credentialSnapshots);
  }
}

async function rememberRegularStudent(
  transaction: DatabaseTransaction,
  participant: RegularWorkflowParticipant,
  now: Date,
) {
  if (participant.rememberedDeviceId) {
    const expiresAt = new Date(
      now.getTime() + REMEMBERED_DEVICE_TTL_SECONDS * 1000,
    );
    const [refreshed] = await transaction
      .update(rememberedDevices)
      .set({ lastUsedAt: now, expiresAt })
      .where(
        and(
          eq(rememberedDevices.id, participant.rememberedDeviceId),
          eq(rememberedDevices.studentId, participant.studentId),
          isNull(rememberedDevices.revokedAt),
          gt(rememberedDevices.expiresAt, now),
        ),
      )
      .returning({ id: rememberedDevices.id });
    if (refreshed) return { id: refreshed.id, expiresAt };
  }
  return createRememberedDeviceInTransaction(
    transaction,
    participant.studentId,
    now,
  );
}

export async function confirmAttendance(
  db: Database,
  signedContext: string,
  input: {
    attestationConfirmed: boolean;
    rememberDevice: boolean;
    request: AttendanceRequestMetadata;
  },
  now = new Date(),
): Promise<AttendanceConfirmationResult> {
  if (!input.attestationConfirmed) {
    throw new AttendanceConfirmationError(
      "Attestation confirmation is required.",
    );
  }
  const context = validateSignInContext(signedContext, now);
  if (!context) throw new InvalidSignInWorkflowError();

  try {
    return await db.transaction(async (transaction) => {
      const [classRecord] = await transaction
        .select({ id: trainingClasses.id })
        .from(trainingClasses)
        .where(
          and(
            eq(trainingClasses.id, context.classId),
            eq(trainingClasses.status, CLASS_STATUSES.OPEN),
            eq(trainingClasses.signInTokenVersion, context.tokenVersion),
          ),
        )
        .limit(1)
        .for("update");
      if (!classRecord) throw new InvalidSignInWorkflowError();

      const nonceHash = hashWorkflowNonce(context.nonce);
      const [staging] = await transaction
        .select()
        .from(signInWorkflowStaging)
        .where(
          and(
            eq(signInWorkflowStaging.classId, context.classId),
            eq(signInWorkflowStaging.nonceHash, nonceHash),
            eq(signInWorkflowStaging.signInTokenVersion, context.tokenVersion),
            eq(signInWorkflowStaging.idempotencyKey, context.idempotencyKey),
            gt(signInWorkflowStaging.expiresAt, now),
          ),
        )
        .limit(1)
        .for("update");
      if (!staging) throw new InvalidSignInWorkflowError();
      const state = decodeSignInWorkflowState(
        staging.encryptedState,
        nonceHash,
      );
      const participant = state.participant;
      const agencyId = state.selectedAgencyId;
      if (!participant || !agencyId) {
        throw new AttendanceConfirmationError("Attendance data is incomplete.");
      }
      const payloadFingerprint = attendancePayloadFingerprint({
        classId: context.classId,
        tokenVersion: context.tokenVersion,
        idempotencyKey: context.idempotencyKey,
        state,
        attestationConfirmed: input.attestationConfirmed,
        rememberDevice: input.rememberDevice,
      });

      const [idempotent] = await transaction
        .select({
          id: attendance.id,
          payloadFingerprint: attendance.payloadFingerprint,
        })
        .from(attendance)
        .where(
          and(
            eq(attendance.classId, context.classId),
            eq(attendance.idempotencyKey, context.idempotencyKey),
          ),
        )
        .limit(1);
      if (idempotent) {
        if (idempotent.payloadFingerprint !== payloadFingerprint) {
          throw new ChangedIdempotencyPayloadError(
            "The confirmation payload changed.",
          );
        }
        return { attendanceId: idempotent.id, status: "idempotent" };
      }
      if (staging.consumedAt) {
        if (participant.kind === "regular") {
          const [active] = await transaction
            .select({ id: attendance.id })
            .from(attendance)
            .where(
              and(
                eq(attendance.classId, context.classId),
                eq(attendance.studentId, participant.studentId),
                isNull(attendance.removedAt),
              ),
            )
            .limit(1);
          if (active) {
            return { attendanceId: active.id, status: "already_signed_in" };
          }
        }
        throw new InvalidSignInWorkflowError();
      }

      const requirements = await resolveClassRequirements(
        transaction,
        context.classId,
        now,
      );
      const [scheduled] = await transaction
        .select({
          hours: sql<string>`coalesce(sum(${classComponents.creditedHours}), 0)`,
        })
        .from(classComponents)
        .where(eq(classComponents.classId, context.classId));
      const scheduledHours = Number(scheduled?.hours ?? 0);
      if (!Number.isFinite(scheduledHours) || scheduledHours <= 0) {
        throw new AttendanceConfirmationError("Class schedule is unavailable.");
      }
      const currentRequirementSets = requirements.sets.map(
        ({ id, version }) => ({
          id,
          version,
        }),
      );
      if (
        JSON.stringify(state.requirementSets) !==
        JSON.stringify(currentRequirementSets)
      ) {
        throw new AttendanceConfirmationError(
          "Class reporting requirements changed. Restart sign-in.",
        );
      }
      let participantName: string;
      let studentId: string | null = null;
      let guestId: string | null = null;
      let fields: Record<string, string>;
      let credentialValues: Map<string, string>;

      if (participant.kind === "regular") {
        await requireRegularAgency(transaction, agencyId);
        const [activeAttendance] = await transaction
          .select({ id: attendance.id })
          .from(attendance)
          .where(
            and(
              eq(attendance.classId, context.classId),
              eq(attendance.studentId, participant.studentId),
              isNull(attendance.removedAt),
            ),
          )
          .limit(1);
        if (activeAttendance) {
          await transaction
            .update(signInWorkflowStaging)
            .set({ consumedAt: now, updatedAt: now })
            .where(eq(signInWorkflowStaging.id, staging.id));
          return {
            attendanceId: activeAttendance.id,
            status: "already_signed_in",
          };
        }
        const facts = await prepareRegularFacts(
          transaction,
          participant,
          requirements,
          now,
        );
        participantName = `${facts.loaded.student.firstName} ${facts.loaded.student.lastName}`;
        studentId = participant.studentId;
        fields = facts.fields;
        credentialValues = facts.credentialValues;

        if (Object.keys(facts.studentUpdates).length > 1) {
          await transaction
            .update(students)
            .set(facts.studentUpdates)
            .where(
              and(
                eq(students.id, participant.studentId),
                eq(students.isActive, true),
              ),
            );
        }
        for (const credential of participant.credentials) {
          const protectedValue = protectedCredentialValue(credential.value);
          await transaction.insert(studentCredentials).values({
            studentId: participant.studentId,
            credentialTypeId: credential.credentialTypeId,
            value: protectedValue.encryptedValue,
            valueHash: protectedValue.valueHash,
            maskedSuffix: protectedValue.maskedSuffix,
          });
          await writeAuditLog(transaction, {
            actorType: "system",
            action: "student.credential.added_from_sign_in",
            entityType: "student",
            entityId: participant.studentId,
            ipAddress: input.request.ipAddress,
            details: { credentialTypeId: credential.credentialTypeId },
          });
        }
        if (
          participant.replacementPhone ||
          Object.keys(participant.fields).length > 0
        ) {
          await writeAuditLog(transaction, {
            actorType: "system",
            action: "student.profile.completed_from_sign_in",
            entityType: "student",
            entityId: participant.studentId,
            ipAddress: input.request.ipAddress,
            details: {
              fields: Object.keys(participant.fields).sort(),
              phoneReplaced: Boolean(participant.replacementPhone),
            },
          });
        }
      } else {
        await requireGuestAgency(transaction, agencyId);
        const facts = prepareGuestFacts(participant, requirements);
        participantName = `${participant.firstName} ${participant.lastName}`;
        fields = facts.fields;
        credentialValues = facts.credentialValues;
        const [guest] = await transaction
          .insert(classGuests)
          .values({
            classId: context.classId,
            firstName: participant.firstName,
            lastName: participant.lastName,
          })
          .returning({ id: classGuests.id });
        if (!guest)
          throw new AttendanceConfirmationError("Attendance unavailable.");
        guestId = guest.id;
      }

      const [created] = await transaction
        .insert(attendance)
        .values({
          classId: context.classId,
          studentId,
          guestId,
          agencyId,
          idempotencyKey: context.idempotencyKey,
          payloadFingerprint,
          signedInAt: now,
          creditedHours: String(scheduledHours),
        })
        .returning({ id: attendance.id });
      if (!created)
        throw new AttendanceConfirmationError("Attendance unavailable.");

      const rememberedDevice =
        participant.kind === "regular" && input.rememberDevice
          ? await rememberRegularStudent(transaction, participant, now)
          : undefined;
      await transaction.insert(attendanceAttestations).values({
        attendanceId: created.id,
        renderedText: renderAttendanceAttestation(participantName),
        textVersion: ATTENDANCE_ATTESTATION_VERSION,
        confirmedAt: now,
        signInMethod:
          participant.kind === "regular" ? participant.signInMethod : "guest",
        originatingIp: input.request.ipAddress,
        requestSourceFingerprint: input.request.requestSourceFingerprint,
        requestCorrelationId: input.request.requestCorrelationId,
        rememberedDeviceId: rememberedDevice?.id,
      });
      await insertReportingSnapshots(
        transaction,
        created.id,
        requirements,
        fields,
        credentialValues,
      );
      await transaction
        .update(signInWorkflowStaging)
        .set({ consumedAt: now, updatedAt: now })
        .where(eq(signInWorkflowStaging.id, staging.id));
      await writeAuditLog(transaction, {
        actorType: "system",
        action: "attendance.public_sign_in",
        entityType: "attendance",
        entityId: created.id,
        ipAddress: input.request.ipAddress,
        details: {
          classId: context.classId,
          participantKind: participant.kind,
          signInMethod:
            participant.kind === "regular" ? participant.signInMethod : "guest",
          requestCorrelationId: input.request.requestCorrelationId,
          requirementSetIds: requirements.sets.map(({ id }) => id),
        },
      });
      return {
        attendanceId: created.id,
        status: "created",
        rememberedDevice,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error, "students_phone_unique")) {
      throw new RecoveryRestartRequiredError("Recovery must be restarted.");
    }
    throw error;
  }
}
