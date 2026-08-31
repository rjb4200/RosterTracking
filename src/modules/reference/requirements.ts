import { and, eq, inArray } from "drizzle-orm";

import { REPORTING_REQUIREMENT_KINDS } from "@/modules/reference/constants";
import type { Database } from "@/server/db/client";
import {
  credentialTypes,
  reportingRequirementSets,
  reportingRequirements,
  reportingSystems,
} from "@/server/db/schema";

export interface RequirementRow {
  kind: string;
  credentialCode: string | null;
  studentField: string | null;
}

export interface RequiredRequirements {
  credentialTypeCodes: string[];
  studentFields: string[];
}

export function reduceRequirements(
  rows: RequirementRow[],
): RequiredRequirements {
  const credentialTypeCodes = new Set<string>();
  const studentFields = new Set<string>();

  for (const row of rows) {
    if (
      row.kind === REPORTING_REQUIREMENT_KINDS.CREDENTIAL &&
      row.credentialCode
    ) {
      credentialTypeCodes.add(row.credentialCode);
    } else if (
      row.kind === REPORTING_REQUIREMENT_KINDS.STUDENT_FIELD &&
      row.studentField
    ) {
      studentFields.add(row.studentField);
    }
  }

  return {
    credentialTypeCodes: [...credentialTypeCodes].sort(),
    studentFields: [...studentFields].sort(),
  };
}

export async function resolveRequiredRequirements(
  db: Database,
  systemCodes: string[],
): Promise<RequiredRequirements> {
  if (systemCodes.length === 0) {
    return { credentialTypeCodes: [], studentFields: [] };
  }

  const rows = await db
    .select({
      kind: reportingRequirements.kind,
      credentialCode: credentialTypes.code,
      studentField: reportingRequirements.studentField,
    })
    .from(reportingSystems)
    .innerJoin(
      reportingRequirementSets,
      and(
        eq(reportingRequirementSets.reportingSystemId, reportingSystems.id),
        eq(reportingRequirementSets.isActive, true),
      ),
    )
    .innerJoin(
      reportingRequirements,
      eq(reportingRequirements.requirementSetId, reportingRequirementSets.id),
    )
    .leftJoin(
      credentialTypes,
      eq(credentialTypes.id, reportingRequirements.credentialTypeId),
    )
    .where(
      and(
        eq(reportingSystems.isActive, true),
        inArray(reportingSystems.code, systemCodes),
        eq(reportingRequirements.isRequired, true),
      ),
    );

  return reduceRequirements(rows);
}

export async function listReportingRequirements(db: Database) {
  return db
    .select({
      systemCode: reportingSystems.code,
      systemName: reportingSystems.name,
      kind: reportingRequirements.kind,
      credentialCode: credentialTypes.code,
      credentialName: credentialTypes.name,
      studentField: reportingRequirements.studentField,
      version: reportingRequirementSets.version,
    })
    .from(reportingSystems)
    .innerJoin(
      reportingRequirementSets,
      and(
        eq(reportingRequirementSets.reportingSystemId, reportingSystems.id),
        eq(reportingRequirementSets.isActive, true),
      ),
    )
    .innerJoin(
      reportingRequirements,
      eq(reportingRequirements.requirementSetId, reportingRequirementSets.id),
    )
    .leftJoin(
      credentialTypes,
      eq(credentialTypes.id, reportingRequirements.credentialTypeId),
    )
    .where(eq(reportingSystems.isActive, true))
    .orderBy(reportingSystems.name);
}
