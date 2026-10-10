import "server-only";

import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";

import {
  CREDENTIAL_TYPE_CODES,
  REPORTING_REQUIREMENT_KINDS,
  REPORTING_SYSTEM_CODES,
} from "@/modules/reference/constants";
import { decryptCredential } from "@/modules/reference/crypto";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  classReportingSystems,
  credentialTypes,
  reportingRequirementSets,
  reportingRequirements,
  reportingSystems,
  studentCredentials,
  students,
} from "@/server/db/schema";

export interface RequirementSetResolution {
  id: string;
  version: number;
  reportingSystemId: string;
  reportingSystemCode: string;
  studentFields: string[];
  credentials: { id: string; code: string }[];
}

export interface ClassRequirements {
  sets: RequirementSetResolution[];
  studentFields: string[];
  credentials: { id: string; code: string }[];
}

export interface RequirementResolutionRow {
  requirementSetId: string;
  version: number;
  reportingSystemId: string;
  reportingSystemCode: string;
  kind: string | null;
  studentField: string | null;
  credentialTypeId: string | null;
  credentialCode: string | null;
}

export function reduceClassRequirements(
  rows: RequirementResolutionRow[],
): ClassRequirements {
  const sets = new Map<string, RequirementSetResolution>();
  const studentFields = new Set<string>();
  const credentials = new Map<string, { id: string; code: string }>();
  for (const row of rows) {
    let set = sets.get(row.requirementSetId);
    if (!set) {
      set = {
        id: row.requirementSetId,
        version: row.version,
        reportingSystemId: row.reportingSystemId,
        reportingSystemCode: row.reportingSystemCode,
        studentFields: [],
        credentials: [],
      };
      sets.set(row.requirementSetId, set);
    }
    if (
      row.kind === REPORTING_REQUIREMENT_KINDS.STUDENT_FIELD &&
      row.studentField
    ) {
      studentFields.add(row.studentField);
      if (!set.studentFields.includes(row.studentField)) {
        set.studentFields.push(row.studentField);
      }
    }
    if (
      row.kind === REPORTING_REQUIREMENT_KINDS.CREDENTIAL &&
      row.credentialTypeId &&
      row.credentialCode
    ) {
      const credential = {
        id: row.credentialTypeId,
        code: row.credentialCode,
      };
      credentials.set(credential.id, credential);
      if (!set.credentials.some(({ id }) => id === credential.id)) {
        set.credentials.push(credential);
      }
    }
  }
  return {
    sets: [...sets.values()].sort((a, b) =>
      a.reportingSystemCode.localeCompare(b.reportingSystemCode),
    ),
    studentFields: [...studentFields].sort(),
    credentials: [...credentials.values()].sort((a, b) =>
      a.code.localeCompare(b.code),
    ),
  };
}

/** Email is required for certificate delivery; reporting never gates sign-in. */
export function requiredRegistrationFields(
  _requirements: ClassRequirements,
): string[] {
  return ["email"];
}

/** Prompts are based on selected destinations, not on roster eligibility. */
export function promptCredentialCodes(systemCodes: string[]): string[] {
  const codes: string[] = [];
  if (systemCodes.includes(REPORTING_SYSTEM_CODES.FIRE)) {
    codes.push(CREDENTIAL_TYPE_CODES.FFN);
  }
  if (systemCodes.includes(REPORTING_SYSTEM_CODES.KBEMS)) {
    codes.push(CREDENTIAL_TYPE_CODES.KEMSIS, CREDENTIAL_TYPE_CODES.NREMT);
  }
  return codes;
}

export async function resolveClassRequirements(
  db: Database | DatabaseTransaction,
  classId: string,
  now = new Date(),
): Promise<ClassRequirements> {
  const rows = await db
    .select({
      requirementSetId: reportingRequirementSets.id,
      version: reportingRequirementSets.version,
      reportingSystemId: reportingSystems.id,
      reportingSystemCode: reportingSystems.code,
      kind: reportingRequirements.kind,
      studentField: reportingRequirements.studentField,
      credentialTypeId: credentialTypes.id,
      credentialCode: credentialTypes.code,
    })
    .from(classReportingSystems)
    .innerJoin(
      reportingSystems,
      eq(reportingSystems.id, classReportingSystems.reportingSystemId),
    )
    .innerJoin(
      reportingRequirementSets,
      and(
        eq(
          reportingRequirementSets.reportingSystemId,
          classReportingSystems.reportingSystemId,
        ),
        eq(reportingRequirementSets.isActive, true),
        lte(reportingRequirementSets.effectiveFrom, now),
        or(
          isNull(reportingRequirementSets.effectiveTo),
          gt(reportingRequirementSets.effectiveTo, now),
        ),
      ),
    )
    .leftJoin(
      reportingRequirements,
      and(
        eq(reportingRequirements.requirementSetId, reportingRequirementSets.id),
        eq(reportingRequirements.isRequired, true),
      ),
    )
    .leftJoin(
      credentialTypes,
      eq(credentialTypes.id, reportingRequirements.credentialTypeId),
    )
    .where(
      and(
        eq(classReportingSystems.classId, classId),
        eq(reportingSystems.isActive, true),
      ),
    );
  const resolved = reduceClassRequirements(rows);
  // Count only active destinations: a class may still reference a destination
  // that has since been deactivated (for example FEMA), which now imposes no
  // requirements and must not make the class unresolvable.
  const selectedSystems = await db
    .select({ id: classReportingSystems.reportingSystemId })
    .from(classReportingSystems)
    .innerJoin(
      reportingSystems,
      and(
        eq(reportingSystems.id, classReportingSystems.reportingSystemId),
        eq(reportingSystems.isActive, true),
      ),
    )
    .where(eq(classReportingSystems.classId, classId));
  if (selectedSystems.length !== resolved.sets.length) {
    throw new Error("Class reporting requirements are unavailable.");
  }
  const promptCodes = promptCredentialCodes(
    resolved.sets.map(({ reportingSystemCode }) => reportingSystemCode),
  );
  const prompts = promptCodes.length
    ? await db
        .select({ id: credentialTypes.id, code: credentialTypes.code })
        .from(credentialTypes)
        .where(
          and(
            inArray(credentialTypes.code, promptCodes),
            eq(credentialTypes.isActive, true),
          ),
        )
    : [];
  const byCode = new Map(prompts.map((prompt) => [prompt.code, prompt]));
  const credentials = promptCodes.flatMap((code) => {
    const prompt = byCode.get(code);
    return prompt ? [prompt] : [];
  });
  return {
    sets: resolved.sets.map((set) => ({
      ...set,
      studentFields: [],
      credentials: promptCredentialCodes([set.reportingSystemCode]).flatMap(
        (code) => {
          const prompt = byCode.get(code);
          return prompt ? [prompt] : [];
        },
      ),
    })),
    studentFields: [],
    credentials,
  };
}

export async function getRegularRequirementValues(
  db: Database | DatabaseTransaction,
  studentId: string,
  requirements: ClassRequirements,
) {
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.isActive, true)))
    .limit(1)
    .for("update");
  if (!student) return null;
  const credentials =
    requirements.credentials.length === 0
      ? []
      : await db
          .select({
            credentialTypeId: studentCredentials.credentialTypeId,
            value: studentCredentials.value,
          })
          .from(studentCredentials)
          .where(
            and(
              eq(studentCredentials.studentId, studentId),
              inArray(
                studentCredentials.credentialTypeId,
                requirements.credentials.map(({ id }) => id),
              ),
            ),
          )
          .for("update");
  const readable = new Map<string, string>();
  for (const credential of credentials) {
    try {
      readable.set(
        credential.credentialTypeId,
        decryptCredential(credential.value),
      );
    } catch {
      // A legacy unreadable credential never blocks attendance or earns credit.
    }
  }
  return { student, credentials: readable };
}
