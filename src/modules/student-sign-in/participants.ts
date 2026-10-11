import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { validateCredentialValue } from "@/modules/reference/credential-format";

import {
  credentialLookupHash,
  encryptCredential,
  normalizeCredentialValue,
} from "@/modules/reference/crypto";
import {
  credentialMaskedSuffix,
  normalizePhone,
} from "@/modules/reference/masking";
import type { Database } from "@/server/db/client";
import { agencies, studentAgencies } from "@/server/db/schema";
import {
  requiredRegistrationFields,
  resolveClassRequirements,
} from "./requirements";
import type {
  GuestWorkflowParticipant,
  NewStudentWorkflowParticipant,
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
  const membershipDefault =
    primary?.id ??
    (memberships.length === 1 ? (memberships[0]?.id ?? null) : null);
  return {
    agencies: [...merged.values()],
    preselectedAgencyId:
      memberships.length === 0 ? (host?.id ?? null) : membershipDefault,
  };
}

export function optionalCredentialMap(
  credentials: { credentialTypeId: string; value: string }[],
  offered: { id: string; code: string }[],
): StagedCredential[] {
  const offeredIds = new Set(offered.map(({ id }) => id));
  if (
    credentials.length !==
      new Set(credentials.map(({ credentialTypeId }) => credentialTypeId))
        .size ||
    credentials.some(
      ({ credentialTypeId }) => !offeredIds.has(credentialTypeId),
    )
  ) {
    throw new Error("Only offered credentials may be submitted.");
  }
  const submitted = new Map(
    credentials.map((credential) => [credential.credentialTypeId, credential]),
  );
  return offered.flatMap((requirement) => {
    const credential = submitted.get(requirement.id);
    if (!credential?.value.trim()) return [];
    return {
      credentialTypeId: requirement.id,
      code: requirement.code,
      value: validateCredentialValue(credential.value, requirement),
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
  const [studentRows, agencyRows] = await Promise.all([
    db.query.students.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.id, participant.studentId), eq(table.isActive, true)),
    }),
    listGuestAttendanceAgencies(db),
  ]);
  if (!studentRows || !agencyRows.some(({ id }) => id === input.agencyId)) {
    throw new Error("The selected student or agency is unavailable.");
  }

  const requiredFields = new Set(requiredRegistrationFields(requirements));
  const stagedFields: Record<string, string> = {};
  for (const [field, value] of Object.entries(input.fields)) {
    if (!requiredFields.has(field)) throw new Error("Field is not required.");
    const existing = studentFieldValue(studentRows, field);
    if (existing)
      throw new Error("Existing student values cannot be replaced.");
    const normalized = value.trim();
    if (!normalized) throw new Error("Required fields cannot be blank.");
    if (field === "email" && !emailSchema.safeParse(normalized).success) {
      throw new Error("Enter a valid email address.");
    }
    stagedFields[field] = normalized;
  }
  for (const field of requiredFields) {
    if (!studentFieldValue(studentRows, field) && !stagedFields[field]) {
      throw new Error("All required student fields are required.");
    }
  }

  // A prompted credential the student already has may be replaced; a value for
  // any other type is rejected. Only credentials the class prompts are offered.
  const stagedCredentials = optionalCredentialMap(
    input.credentials,
    requirements.credentials,
  );

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
  for (const field of requiredRegistrationFields(requirements)) {
    const value = input.fields[field]?.trim();
    if (!value) throw new Error("All required student fields are required.");
    if (field === "email" && !emailSchema.safeParse(value).success) {
      throw new Error("Enter a valid email address.");
    }
    fields[field] = value;
  }
  const participant: GuestWorkflowParticipant = {
    kind: "guest",
    firstName,
    lastName,
    fields,
    credentials: optionalCredentialMap(
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

const emailSchema = z.string().trim().email().max(254);

export async function stageNewStudentParticipant(
  db: Database,
  signedContext: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
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
    throw new Error("First and last name are required.");
  }
  let phone: string;
  try {
    phone = normalizePhone(input.phone);
  } catch {
    throw new Error("Enter a valid 10-digit US phone number.");
  }
  const agencyOptions = await listGuestAttendanceAgencies(db);
  if (!agencyOptions.some(({ id }) => id === input.agencyId)) {
    throw new Error("The selected agency is unavailable.");
  }
  const fields: Record<string, string> = {};
  for (const field of requiredRegistrationFields(requirements)) {
    const value = input.fields[field]?.trim();
    if (!value) throw new Error("All required student fields are required.");
    if (field === "email" && !emailSchema.safeParse(value).success) {
      throw new Error("Enter a valid email address.");
    }
    fields[field] = value;
  }
  const participant: NewStudentWorkflowParticipant = {
    kind: "new_student",
    firstName,
    lastName,
    phone,
    fields,
    credentials: optionalCredentialMap(
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
