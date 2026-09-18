import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import {
  credentialLookupHash,
  encryptCredential,
  normalizeCredentialValue,
} from "@/modules/reference/crypto";
import { credentialMaskedSuffix } from "@/modules/reference/masking";
import type { Database } from "@/server/db/client";
import {
  agencies,
  studentAgencies,
  studentCredentials,
} from "@/server/db/schema";

import { resolveClassRequirements } from "./requirements";
import type {
  GuestWorkflowParticipant,
  RegularWorkflowParticipant,
  SignInWorkflowState,
  StagedCredential,
} from "./types";
import { loadSignInWorkflow, updateSignInWorkflow } from "./workflow";

export interface AgencyOption {
  id: string;
  name: string;
  isPrimary?: boolean;
}

export async function listRegularAttendanceAgencies(
  db: Database,
  studentId: string,
): Promise<AgencyOption[]> {
  return db
    .select({
      id: agencies.id,
      name: agencies.name,
      isPrimary: studentAgencies.isPrimary,
    })
    .from(studentAgencies)
    .innerJoin(agencies, eq(agencies.id, studentAgencies.agencyId))
    .where(
      and(
        eq(studentAgencies.studentId, studentId),
        eq(studentAgencies.isActive, true),
        eq(agencies.isActive, true),
      ),
    )
    .orderBy(desc(studentAgencies.isPrimary), asc(agencies.name));
}

export async function listGuestAttendanceAgencies(
  db: Database,
): Promise<AgencyOption[]> {
  return db
    .select({ id: agencies.id, name: agencies.name })
    .from(agencies)
    .where(eq(agencies.isActive, true))
    .orderBy(agencies.name);
}

export async function resolveRegularAttendanceAgencies(
  db: Database,
  studentId: string,
  hostAgencyId: string | null,
): Promise<{ agencies: AgencyOption[]; preselectedAgencyId: string | null }> {
  const [memberships, catalog] = await Promise.all([
    listRegularAttendanceAgencies(db, studentId),
    listGuestAttendanceAgencies(db),
  ]);
  const host = hostAgencyId
    ? catalog.find((agency) => agency.id === hostAgencyId)
    : undefined;
  if (host && memberships.some((agency) => agency.id === host.id)) {
    return {
      agencies: [
        host,
        ...memberships.filter((agency) => agency.id !== host.id),
      ],
      preselectedAgencyId: host.id,
    };
  }
  const merged = new Map<string, AgencyOption>();
  for (const agency of memberships) merged.set(agency.id, agency);
  for (const agency of catalog) {
    if (!merged.has(agency.id)) merged.set(agency.id, agency);
  }
  const primary = memberships.find((agency) => agency.isPrimary);
  return {
    agencies: [...merged.values()],
    preselectedAgencyId:
      primary?.id ??
      (memberships.length === 1 ? (memberships[0]?.id ?? null) : null),
  };
}

function requiredCredentialMap(
  credentials: { credentialTypeId: string; value: string }[],
  required: { id: string; code: string }[],
): StagedCredential[] {
  const requiredIds = new Set(required.map(({ id }) => id));
  if (
    credentials.length !==
      new Set(credentials.map(({ credentialTypeId }) => credentialTypeId))
        .size ||
    credentials.some(
      ({ credentialTypeId }) => !requiredIds.has(credentialTypeId),
    )
  ) {
    throw new Error("Only missing required credentials may be submitted.");
  }
  const submitted = new Map(
    credentials.map((credential) => [credential.credentialTypeId, credential]),
  );
  return required.map((requirement) => {
    const credential = submitted.get(requirement.id);
    if (!credential) throw new Error("All required credentials are required.");
    return {
      credentialTypeId: requirement.id,
      code: requirement.code,
      value: normalizeCredentialValue(credential.value),
    };
  });
}

export async function stageRegularRequirements(
  db: Database,
  signedContext: string,
  input: {
    fields: Record<string, string>;
    credentials: { credentialTypeId: string; value: string }[];
    agencyId: string;
  },
  now = new Date(),
): Promise<SignInWorkflowState> {
  const loaded = await loadSignInWorkflow(db, signedContext, now);
  const participant = loaded.state.participant;
  if (participant?.kind !== "regular") {
    throw new Error("A confirmed regular student is required.");
  }
  const requirements = await resolveClassRequirements(
    db,
    loaded.context.classId,
    now,
  );
  const [studentRows, existingCredentials, agencyRows] = await Promise.all([
    db.query.students.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.id, participant.studentId), eq(table.isActive, true)),
    }),
    db
      .select({ credentialTypeId: studentCredentials.credentialTypeId })
      .from(studentCredentials)
      .where(eq(studentCredentials.studentId, participant.studentId)),
    listGuestAttendanceAgencies(db),
  ]);
  if (!studentRows || !agencyRows.some(({ id }) => id === input.agencyId)) {
    throw new Error("The selected student or agency is unavailable.");
  }

  const requiredFields = new Set(requirements.studentFields);
  const stagedFields: Record<string, string> = {};
  for (const [field, value] of Object.entries(input.fields)) {
    if (!requiredFields.has(field)) throw new Error("Field is not required.");
    const existing = studentFieldValue(studentRows, field);
    if (existing)
      throw new Error("Existing student values cannot be replaced.");
    const normalized = value.trim();
    if (!normalized) throw new Error("Required fields cannot be blank.");
    stagedFields[field] = normalized;
  }
  for (const field of requirements.studentFields) {
    if (!studentFieldValue(studentRows, field) && !stagedFields[field]) {
      throw new Error("All required student fields are required.");
    }
  }

  const existingTypeIds = new Set(
    existingCredentials.map(({ credentialTypeId }) => credentialTypeId),
  );
  const missingCredentials = requirements.credentials.filter(
    ({ id }) => !existingTypeIds.has(id),
  );
  const stagedCredentials = requiredCredentialMap(
    input.credentials,
    missingCredentials,
  );
  if (
    input.credentials.some((credential) =>
      existingTypeIds.has(credential.credentialTypeId),
    )
  ) {
    throw new Error("Existing credentials cannot be replaced.");
  }

  const state: SignInWorkflowState = {
    participant: {
      ...participant,
      fields: stagedFields,
      credentials: stagedCredentials,
    },
    selectedAgencyId: input.agencyId,
    pendingNewPhone: null,
    requirementSets: requirements.sets.map(({ id, version }) => ({
      id,
      version,
    })),
  };
  await updateSignInWorkflow(db, signedContext, state, now);
  return state;
}

export async function stageGuestParticipant(
  db: Database,
  signedContext: string,
  input: {
    firstName: string;
    lastName: string;
    fields: Record<string, string>;
    credentials: { credentialTypeId: string; value: string }[];
    agencyId: string;
  },
  now = new Date(),
): Promise<SignInWorkflowState> {
  const loaded = await loadSignInWorkflow(db, signedContext, now);
  const requirements = await resolveClassRequirements(
    db,
    loaded.context.classId,
    now,
  );
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (
    !firstName ||
    !lastName ||
    firstName.length > 100 ||
    lastName.length > 100
  ) {
    throw new Error("Guest first and last name are required.");
  }
  const agencyOptions = await listGuestAttendanceAgencies(db);
  if (!agencyOptions.some(({ id }) => id === input.agencyId)) {
    throw new Error("The selected agency is unavailable.");
  }
  const fields: Record<string, string> = {};
  for (const field of requirements.studentFields) {
    const value = input.fields[field]?.trim();
    if (!value) throw new Error("All required student fields are required.");
    fields[field] = value;
  }
  const participant: GuestWorkflowParticipant = {
    kind: "guest",
    firstName,
    lastName,
    fields,
    credentials: requiredCredentialMap(
      input.credentials,
      requirements.credentials,
    ),
  };
  const state = {
    participant,
    selectedAgencyId: input.agencyId,
    pendingNewPhone: null,
    requirementSets: requirements.sets.map(({ id, version }) => ({
      id,
      version,
    })),
  };
  await updateSignInWorkflow(db, signedContext, state, now);
  return state;
}

type StudentRecord = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  studentNumber: string | null;
};

export function studentFieldValue(
  student: StudentRecord,
  field: string,
): string | null {
  switch (field) {
    case "firstName":
      return student.firstName;
    case "lastName":
      return student.lastName;
    case "phone":
      return student.phone;
    case "email":
      return student.email;
    case "studentNumber":
      return student.studentNumber;
    default:
      throw new Error(`Unsupported required student field: ${field}`);
  }
}

export function protectedCredentialValue(value: string) {
  const normalized = normalizeCredentialValue(value);
  return {
    encryptedValue: encryptCredential(normalized),
    valueHash: credentialLookupHash(normalized),
    maskedSuffix: credentialMaskedSuffix(normalized),
  };
}

export type { RegularWorkflowParticipant };
