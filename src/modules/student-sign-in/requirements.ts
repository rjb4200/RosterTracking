import "server-only";

import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";

import { REPORTING_REQUIREMENT_KINDS } from "@/modules/reference/constants";
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

/**
 * The student fields a new registration must collect: every class-required
 * field plus an email address, which is always required to create a profile.
 */
export function requiredRegistrationFields(
  requirements: ClassRequirements,
): string[] {
  return requirements.studentFields.includes("email")
    ? requirements.studentFields
    : ["email", ...requirements.studentFields];
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
  return resolved;
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
  return {
    student,
    credentials: new Map(
      credentials.map((credential) => [
        credential.credentialTypeId,
        decryptCredential(credential.value),
      ]),
    ),
  };
}
