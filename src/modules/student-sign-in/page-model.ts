import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { Database } from "@/server/db/client";
import { studentCredentials, students } from "@/server/db/schema";

import { renderAttendanceAttestation } from "./attendance";
import {
  listGuestAttendanceAgencies,
  listRegularAttendanceAgencies,
  studentFieldValue,
} from "./participants";
import { resolveClassRequirements } from "./requirements";
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
    }
  | {
      step: "regular-details";
      participantName: string;
      fields: { key: string; label: string }[];
      credentials: { id: string; code: string }[];
      agencies: { id: string; name: string }[];
    }
  | {
      step: "guest-details";
      fields: { key: string; label: string }[];
      credentials: { id: string; code: string }[];
      agencies: { id: string; name: string }[];
    }
  | {
      step: "review";
      participantName: string;
      regular: boolean;
      attestation: string;
    };

export function requestedEntryStep(
  value: string | undefined,
): "phone" | "recovery" | "guest" {
  if (value === "recovery" || value === "guest") return value;
  return "phone";
}

function fieldsForForm(fields: string[]) {
  return fields.map((key) => ({
    key,
    label: PUBLIC_FIELD_LABELS[key] ?? key,
  }));
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
    if (entry !== "guest") return { step: "phone" };
    const [requirements, agencies] = await Promise.all([
      resolveClassRequirements(db, loaded.context.classId),
      listGuestAttendanceAgencies(db),
    ]);
    return {
      step: "guest-details",
      fields: fieldsForForm(requirements.studentFields),
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
  if (!participant.profileConfirmed) {
    return {
      step: "confirm-profile",
      participantName,
      recovered: participant.signInMethod === "recovery",
      maskedCredentials: participant.maskedCredentials ?? [],
    };
  }
  if (state.selectedAgencyId) {
    return {
      step: "review",
      participantName,
      regular: true,
      attestation: renderAttendanceAttestation(participantName),
    };
  }

  const requirements = await resolveClassRequirements(
    db,
    loaded.context.classId,
  );
  const existingCredentials =
    requirements.credentials.length === 0
      ? []
      : await db
          .select({ credentialTypeId: studentCredentials.credentialTypeId })
          .from(studentCredentials)
          .where(
            and(
              eq(studentCredentials.studentId, participant.studentId),
              inArray(
                studentCredentials.credentialTypeId,
                requirements.credentials.map(({ id }) => id),
              ),
            ),
          );
  const existingCredentialIds = new Set(
    existingCredentials.map(({ credentialTypeId }) => credentialTypeId),
  );
  return {
    step: "regular-details",
    participantName,
    fields: fieldsForForm(
      requirements.studentFields.filter(
        (field) => !studentFieldValue(student, field),
      ),
    ),
    credentials: requirements.credentials.filter(
      ({ id }) => !existingCredentialIds.has(id),
    ),
    agencies: await listRegularAttendanceAgencies(db, participant.studentId),
  };
}

export function confirmationDestination(
  status: "created" | "idempotent" | "already_signed_in",
) {
  return status === "created"
    ? "/sign-in?status=success"
    : "/sign-in?status=already-signed-in";
}
