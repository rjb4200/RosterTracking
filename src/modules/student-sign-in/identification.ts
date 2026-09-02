import "server-only";

import { and, eq, inArray, ne } from "drizzle-orm";

import { CREDENTIAL_TYPE_CODES } from "@/modules/reference/constants";
import {
  credentialLookupHash,
  normalizeCredentialValue,
} from "@/modules/reference/crypto";
import { normalizePhone } from "@/modules/reference/masking";
import type { Database } from "@/server/db/client";
import {
  credentialTypes,
  studentCredentials,
  students,
} from "@/server/db/schema";

import { resolveRememberedDevice } from "./remembered-device";
import type { RecoveryCredentialType, SignInWorkflowState } from "./types";
import { updateSignInWorkflow } from "./workflow";

export const RECOVERY_CREDENTIAL_TYPES = [
  CREDENTIAL_TYPE_CODES.FFN,
  CREDENTIAL_TYPE_CODES.KEMSIS,
] as const;

export interface PublicStudentProjection {
  id: string;
  firstName: string;
  lastName: string;
}

export type RecognitionResult =
  | {
      status: "identified";
      method: "remembered_device" | "current_phone" | "recovery";
      student: PublicStudentProjection;
      rememberedDeviceId?: string;
      replacementPhone?: string;
      maskedCredentials?: {
        code: RecoveryCredentialType;
        maskedSuffix: string;
      }[];
    }
  | { status: "recovery_or_guest" };

const publicStudentSelection = {
  id: students.id,
  firstName: students.firstName,
  lastName: students.lastName,
};

export async function findActiveStudentByCurrentPhone(
  db: Database,
  phone: string,
): Promise<PublicStudentProjection | null> {
  const normalizedPhone = normalizePhone(phone);
  const [student] = await db
    .select(publicStudentSelection)
    .from(students)
    .where(
      and(eq(students.phone, normalizedPhone), eq(students.isActive, true)),
    )
    .limit(1);
  return student ?? null;
}

export async function recognizeStudent(
  db: Database,
  input: {
    rememberedToken?: string;
    currentPhone?: string;
    recovery?: {
      priorPhone: string;
      newPhone: string;
      credentialType: RecoveryCredentialType;
      credentialValue: string;
    };
  },
): Promise<RecognitionResult> {
  if (input.rememberedToken) {
    const remembered = await resolveRememberedDevice(db, input.rememberedToken);
    if (remembered) {
      return {
        status: "identified",
        method: "remembered_device",
        rememberedDeviceId: remembered.id,
        student: {
          id: remembered.studentId,
          firstName: remembered.firstName,
          lastName: remembered.lastName,
        },
      };
    }
  }
  if (input.currentPhone) {
    const student = await findActiveStudentByCurrentPhone(
      db,
      input.currentPhone,
    );
    if (student) {
      return { status: "identified", method: "current_phone", student };
    }
  }
  if (input.recovery) return recoverActiveStudent(db, input.recovery);
  return { status: "recovery_or_guest" };
}

export async function recoverActiveStudent(
  db: Database,
  input: {
    priorPhone: string;
    newPhone: string;
    credentialType: RecoveryCredentialType;
    credentialValue: string;
  },
): Promise<RecognitionResult> {
  let priorPhone: string;
  let newPhone: string;
  let normalizedCredential: string;
  try {
    priorPhone = normalizePhone(input.priorPhone);
    newPhone = normalizePhone(input.newPhone);
    normalizedCredential = normalizeCredentialValue(input.credentialValue);
  } catch {
    return { status: "recovery_or_guest" };
  }
  const [matched] = await db
    .select({
      ...publicStudentSelection,
    })
    .from(students)
    .innerJoin(
      studentCredentials,
      eq(studentCredentials.studentId, students.id),
    )
    .innerJoin(
      credentialTypes,
      eq(credentialTypes.id, studentCredentials.credentialTypeId),
    )
    .where(
      and(
        eq(students.phone, priorPhone),
        eq(students.isActive, true),
        eq(credentialTypes.code, input.credentialType),
        eq(credentialTypes.isActive, true),
        eq(
          studentCredentials.valueHash,
          credentialLookupHash(normalizedCredential),
        ),
      ),
    )
    .limit(1);

  if (!matched) return { status: "recovery_or_guest" };
  const [phoneOwner] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.phone, newPhone), ne(students.id, matched.id)))
    .limit(1);
  if (phoneOwner) return { status: "recovery_or_guest" };

  const maskedCredentials = await listRecoveryCredentialMasks(db, matched.id);

  return {
    status: "identified",
    method: "recovery",
    replacementPhone: newPhone,
    maskedCredentials,
    student: {
      id: matched.id,
      firstName: matched.firstName,
      lastName: matched.lastName,
    },
  };
}

async function listRecoveryCredentialMasks(
  db: Database,
  studentId: string,
): Promise<{ code: RecoveryCredentialType; maskedSuffix: string }[]> {
  return db
    .select({
      code: credentialTypes.code,
      maskedSuffix: studentCredentials.maskedSuffix,
    })
    .from(studentCredentials)
    .innerJoin(
      credentialTypes,
      eq(credentialTypes.id, studentCredentials.credentialTypeId),
    )
    .where(
      and(
        eq(studentCredentials.studentId, studentId),
        inArray(credentialTypes.code, [...RECOVERY_CREDENTIAL_TYPES]),
      ),
    ) as Promise<{ code: RecoveryCredentialType; maskedSuffix: string }[]>;
}

export function confirmRecognizedStudent(
  state: SignInWorkflowState,
  recognition: Extract<RecognitionResult, { status: "identified" }>,
): SignInWorkflowState {
  return {
    participant: {
      kind: "regular",
      studentId: recognition.student.id,
      signInMethod: recognition.method,
      profileConfirmed: true,
      rememberedDeviceId: recognition.rememberedDeviceId,
      maskedCredentials: recognition.maskedCredentials ?? [],
      replacementPhone: recognition.replacementPhone,
      fields: {},
      credentials: [],
    },
    selectedAgencyId: state.selectedAgencyId,
    pendingNewPhone: null,
    requirementSets: state.requirementSets,
  };
}

export function stagePendingRecognizedStudent(
  state: SignInWorkflowState,
  recognition: Extract<RecognitionResult, { status: "identified" }>,
): SignInWorkflowState {
  return {
    participant: {
      kind: "regular",
      studentId: recognition.student.id,
      signInMethod: recognition.method,
      profileConfirmed: false,
      rememberedDeviceId: recognition.rememberedDeviceId,
      maskedCredentials: recognition.maskedCredentials ?? [],
      replacementPhone: recognition.replacementPhone,
      fields: {},
      credentials: [],
    },
    selectedAgencyId: null,
    pendingNewPhone: null,
    requirementSets: state.requirementSets,
  };
}

export function clearParticipantForNotMe(
  _state: SignInWorkflowState,
): SignInWorkflowState {
  return {
    participant: null,
    selectedAgencyId: null,
    pendingNewPhone: null,
    requirementSets: _state.requirementSets,
  };
}

export async function stageConfirmedStudent(
  db: Database,
  signedContext: string,
  state: SignInWorkflowState,
  recognition: Extract<RecognitionResult, { status: "identified" }>,
  now = new Date(),
) {
  const confirmed = confirmRecognizedStudent(state, recognition);
  await updateSignInWorkflow(db, signedContext, confirmed, now);
  return confirmed;
}

export async function clearRecoveryForNotMe(
  db: Database,
  signedContext: string,
  state: SignInWorkflowState,
  now = new Date(),
) {
  const cleared = clearParticipantForNotMe(state);
  await updateSignInWorkflow(db, signedContext, cleared, now);
  return cleared;
}
