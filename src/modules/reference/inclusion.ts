import { and, eq, gt, isNull, lte, or } from "drizzle-orm";

import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  classReportingSystems,
  credentialTypes,
  reportingRequirementSets,
  reportingSystems,
} from "@/server/db/schema";

import { validateCredentialValue } from "./credential-format";

export type InclusionRule = {
  reportingSystemCode: string;
  requirementSetId: string;
  version: number;
  mode: "all" | "none" | "credential";
  credentialCode: string | null;
  credentialPattern: string | null;
};

export function includesParticipant(
  rule: InclusionRule,
  credentials: Record<string, string | null | undefined>,
): boolean {
  if (rule.mode === "all") return true;
  if (rule.mode === "none") return false;
  if (!rule.credentialCode) return false;
  const value = credentials[rule.credentialCode];
  if (!value) return false;
  try {
    validateCredentialValue(value, {
      code: rule.credentialCode,
      valuePattern: rule.credentialPattern,
    });
    return true;
  } catch {
    // Historical malformed credentials remain stored, but do not confer credit.
    return false;
  }
}

/**
 * The Fire Commission credits only valid-FFN attendees, so a Fire class warns
 * a student before confirmation when their FFN would not earn Fire credit.
 */
export function needsFireCreditWarning(
  rule: InclusionRule | undefined,
  ffn: string | null | undefined,
): boolean {
  if (rule?.mode !== "credential") return false;
  return !includesParticipant(rule, { ffn });
}

export async function resolveClassInclusionRules(
  db: Database | DatabaseTransaction,
  classId: string,
  now = new Date(),
): Promise<InclusionRule[]> {
  const rows = await db
    .select({
      reportingSystemCode: reportingSystems.code,
      requirementSetId: reportingRequirementSets.id,
      version: reportingRequirementSets.version,
      mode: reportingRequirementSets.inclusionMode,
      credentialCode: credentialTypes.code,
      credentialPattern: credentialTypes.valuePattern,
    })
    .from(classReportingSystems)
    .innerJoin(
      reportingSystems,
      eq(reportingSystems.id, classReportingSystems.reportingSystemId),
    )
    .innerJoin(
      reportingRequirementSets,
      and(
        eq(reportingRequirementSets.reportingSystemId, reportingSystems.id),
        eq(reportingRequirementSets.isActive, true),
        lte(reportingRequirementSets.effectiveFrom, now),
        or(
          isNull(reportingRequirementSets.effectiveTo),
          gt(reportingRequirementSets.effectiveTo, now),
        ),
      ),
    )
    .leftJoin(
      credentialTypes,
      eq(
        credentialTypes.id,
        reportingRequirementSets.inclusionCredentialTypeId,
      ),
    )
    .where(
      and(
        eq(classReportingSystems.classId, classId),
        eq(reportingSystems.isActive, true),
      ),
    );

  const selected = await db
    .select({ id: reportingSystems.id })
    .from(classReportingSystems)
    .innerJoin(
      reportingSystems,
      and(
        eq(reportingSystems.id, classReportingSystems.reportingSystemId),
        eq(reportingSystems.isActive, true),
      ),
    )
    .where(eq(classReportingSystems.classId, classId));
  if (selected.length !== rows.length) {
    throw new Error("Reporting inclusion rules are unavailable.");
  }

  return rows.map((row) => {
    if (
      row.mode !== "all" &&
      row.mode !== "none" &&
      row.mode !== "credential"
    ) {
      throw new Error("Reporting inclusion rule is unavailable.");
    }
    if (row.mode === "credential" && !row.credentialCode) {
      throw new Error("Reporting inclusion credential is unavailable.");
    }
    return { ...row, mode: row.mode };
  });
}
