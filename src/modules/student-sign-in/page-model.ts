import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  CREDENTIAL_TYPE_CODES,
  REPORTING_SYSTEM_CODES,
} from "@/modules/reference/constants";
import { decryptCredential } from "@/modules/reference/crypto";
import {
  needsFireCreditWarning,
  resolveClassInclusionRules,
} from "@/modules/reference/inclusion";
import type { Database } from "@/server/db/client";
import {
  credentialTypes,
  studentCredentials,
  students,
  trainingClasses,
} from "@/server/db/schema";

import { renderAttendanceAttestation } from "./attendance";
import {
  listGuestAttendanceAgencies,
  resolveRegularAttendanceAgencies,
  studentFieldValue,
} from "./participants";
import {
  requiredRegistrationFields,
  resolveClassRequirements,
} from "./requirements";
import { loadSignInWorkflow } from "./workflow";

export const PUBLIC_FIELD_LABELS: Record<string, string> = {
  email: "Email address",
  studentNumber: "Student number",
};

export type SignInPageModel =
  | { step: "phone" }
  | { step: "recovery" }
  | {
      step: "confirm-profile";
      participantName: string;
      recovered: boolean;
      maskedCredentials: { code: string; maskedSuffix: string }[];
      email: string | null;
    }
  | {
      step: "recognized";
      participantName: string;
      maskedCredentials: { code: string; maskedSuffix: string }[];
      fields: { key: string; label: string }[];
      credentials: { id: string; code: string }[];
      agencies: { id: string; name: string }[];
      preselectedAgencyId: string | null;
      attestation: string;
      email: string | null;
      fireCreditWarning: boolean;
    }
  | {
      step: "regular-details";
      participantName: string;
      fields: { key: string; label: string }[];
      credentials: { id: string; code: string }[];
      agencies: { id: string; name: string }[];
      preselectedAgencyId: string | null;
      email: string | null;
    }
  | {
      step: "guest-details";
      fields: { key: string; label: string }[];
      credentials: { id: string; code: string }[];
      agencies: { id: string; name: string }[];
    }
  | {
      step: "new-student-details";
      phone: string;
      fields: { key: string; label: string }[];
      credentials: { id: string; code: string }[];
      agencies: { id: string; name: string }[];
      preselectedAgencyId: string | null;
    }
  | {
      step: "review";
      participantName: string;
      regular: boolean;
      attestation: string;
      fireCreditWarning: boolean;
    };

export function requestedEntryStep(
  value: string | undefined,
): "phone" | "recovery" | "guest" | "register" {
  if (value === "recovery" || value === "guest" || value === "register")
    return value;
  return "phone";
}

function fieldsForForm(fields: string[]) {
  return fields.map((key) => ({
    key,
    label: PUBLIC_FIELD_LABELS[key] ?? key,
  }));
}

interface PublicStudentFields {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  studentNumber: string | null;
}

async function resolveRegularDetails(
  db: Database,
  classId: string,
  studentId: string,
  student: PublicStudentFields,
) {
  const requirements = await resolveClassRequirements(db, classId);
  const existingCredentials =
    requirements.credentials.length === 0
      ? []
      : await db
          .select({ credentialTypeId: studentCredentials.credentialTypeId })
          .from(studentCredentials)
          .where(
            and(
              eq(studentCredentials.studentId, studentId),
              inArray(
                studentCredentials.credentialTypeId,
                requirements.credentials.map(({ id }) => id),
              ),
            ),
          );
  const existingCredentialIds = new Set(
    existingCredentials.map(({ credentialTypeId }) => credentialTypeId),
  );
  const [classRecord] = await db
    .select({ hostAgencyId: trainingClasses.hostAgencyId })
    .from(trainingClasses)
    .where(eq(trainingClasses.id, classId))
    .limit(1);
  const agencyResolution = await resolveRegularAttendanceAgencies(
    db,
    studentId,
    classRecord?.hostAgencyId ?? null,
  );
  return {
    fields: fieldsForForm(
      requiredRegistrationFields(requirements).filter(
        (field) => !studentFieldValue(student, field),
      ),
    ),
    credentials: requirements.credentials.filter(
      ({ id }) => !existingCredentialIds.has(id),
    ),
    agencies: agencyResolution.agencies,
    preselectedAgencyId: agencyResolution.preselectedAgencyId,
  };
}

async function listMaskedCredentials(
  db: Database,
  studentId: string,
): Promise<{ code: string; maskedSuffix: string }[]> {
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
        inArray(credentialTypes.code, ["ffn", "kemsis"]),
      ),
    );
}

async function fireCreditWarning(
  db: Database,
  classId: string,
  participant: NonNullable<
    Awaited<ReturnType<typeof loadSignInWorkflow>>["state"]["participant"]
  >,
): Promise<boolean> {
  const rules = await resolveClassInclusionRules(db, classId);
  const fire = rules.find(
    ({ reportingSystemCode }) =>
      reportingSystemCode === REPORTING_SYSTEM_CODES.FIRE,
  );
  if (!fire) return false;
  let ffn = participant.credentials.find(
    ({ code }) => code === CREDENTIAL_TYPE_CODES.FFN,
  )?.value;
  if (!ffn && participant.kind === "regular") {
    const [stored] = await db
      .select({ value: studentCredentials.value })
      .from(studentCredentials)
      .innerJoin(
        credentialTypes,
        eq(credentialTypes.id, studentCredentials.credentialTypeId),
      )
      .where(
        and(
          eq(studentCredentials.studentId, participant.studentId),
          eq(credentialTypes.code, CREDENTIAL_TYPE_CODES.FFN),
        ),
      )
      .limit(1);
    if (stored) {
      try {
        ffn = decryptCredential(stored.value);
      } catch {
        // Legacy test credentials which cannot be read do not earn Fire credit.
      }
    }
  }
  return needsFireCreditWarning(fire, ffn);
}

export async function buildSignInPageModel(
  db: Database,
  signedContext: string,
  requestedStep?: string,
): Promise<SignInPageModel> {
  const loaded = await loadSignInWorkflow(db, signedContext);
  const state = loaded.state;
  const participant = state.participant;

  if (!participant) {
    const entry = requestedEntryStep(requestedStep);
    if (entry === "recovery" && state.pendingNewPhone)
      return { step: "recovery" };
    if (entry === "register") {
      const [requirements, agencies, classRows] = await Promise.all([
        resolveClassRequirements(db, loaded.context.classId),
        listGuestAttendanceAgencies(db),
        db
          .select({ hostAgencyId: trainingClasses.hostAgencyId })
          .from(trainingClasses)
          .where(eq(trainingClasses.id, loaded.context.classId))
          .limit(1),
      ]);
      const hostAgencyId = classRows[0]?.hostAgencyId ?? null;
      return {
        step: "new-student-details",
        phone: state.pendingNewPhone ?? "",
        fields: fieldsForForm(requiredRegistrationFields(requirements)),
        credentials: requirements.credentials,
        agencies,
        preselectedAgencyId:
          hostAgencyId && agencies.some(({ id }) => id === hostAgencyId)
            ? hostAgencyId
            : null,
      };
    }
    if (entry !== "guest") return { step: "phone" };
    const [requirements, agencies] = await Promise.all([
      resolveClassRequirements(db, loaded.context.classId),
      listGuestAttendanceAgencies(db),
    ]);
    return {
      step: "guest-details",
      fields: fieldsForForm(requiredRegistrationFields(requirements)),
      credentials: requirements.credentials,
      agencies,
    };
  }

  if (participant.kind === "guest") {
    return {
      step: "review",
      participantName: `${participant.firstName} ${participant.lastName}`,
      regular: false,
      attestation: renderAttendanceAttestation(
        `${participant.firstName} ${participant.lastName}`,
      ),
      fireCreditWarning: await fireCreditWarning(
        db,
        loaded.context.classId,
        participant,
      ),
    };
  }

  if (participant.kind === "new_student") {
    const participantName = `${participant.firstName} ${participant.lastName}`;
    return {
      step: "review",
      participantName,
      regular: true,
      attestation: renderAttendanceAttestation(participantName),
      fireCreditWarning: await fireCreditWarning(
        db,
        loaded.context.classId,
        participant,
      ),
    };
  }

  const student = await db.query.students.findFirst({
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      studentNumber: true,
    },
    where: and(
      eq(students.id, participant.studentId),
      eq(students.isActive, true),
    ),
  });
  if (!student) throw new Error("Sign-in is unavailable.");
  const participantName = `${student.firstName} ${student.lastName}`;
  if (participant.profileConfirmed) {
    if (state.selectedAgencyId) {
      return {
        step: "review",
        participantName,
        regular: true,
        attestation: renderAttendanceAttestation(participantName),
        fireCreditWarning: await fireCreditWarning(
          db,
          loaded.context.classId,
          participant,
        ),
      };
    }
    return {
      step: "regular-details",
      participantName,
      email: student.email,
      ...(await resolveRegularDetails(
        db,
        loaded.context.classId,
        participant.studentId,
        student,
      )),
    };
  }

  if (participant.signInMethod === "remembered_device") {
    const [details, maskedCredentials] = await Promise.all([
      resolveRegularDetails(
        db,
        loaded.context.classId,
        participant.studentId,
        student,
      ),
      listMaskedCredentials(db, participant.studentId),
    ]);
    return {
      step: "recognized",
      participantName,
      maskedCredentials,
      email: student.email,
      ...details,
      attestation: renderAttendanceAttestation(participantName),
      fireCreditWarning: await fireCreditWarning(
        db,
        loaded.context.classId,
        participant,
      ),
    };
  }

  return {
    step: "confirm-profile",
    participantName,
    recovered: participant.signInMethod === "recovery",
    maskedCredentials: participant.maskedCredentials ?? [],
    email: student.email,
  };
}

export function confirmationDestination(
  status: "created" | "idempotent" | "already_signed_in",
) {
  return status === "created"
    ? "/sign-in?status=success"
    : "/sign-in?status=already-signed-in";
}
