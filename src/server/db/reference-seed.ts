import { inArray, sql } from "drizzle-orm";

import {
  CREDENTIAL_TYPE_CODES,
  REPORTING_REQUIREMENT_KINDS,
  REPORTING_SYSTEM_CODES,
} from "@/modules/reference/constants";

import type { DatabaseTransaction } from "./client";
import {
  credentialTypes,
  reportingRequirementSets,
  reportingRequirements,
  reportingSystems,
} from "./schema";

const credentialTypeDefinitions = [
  {
    code: CREDENTIAL_TYPE_CODES.FFN,
    name: "Kentucky Firefighter Number",
    issuer: "Kentucky Fire Commission",
  },
  {
    code: CREDENTIAL_TYPE_CODES.KEMSIS,
    name: "KEMSIS ID",
    issuer: "KBEMS",
  },
  {
    code: CREDENTIAL_TYPE_CODES.NREMT,
    name: "NREMT Number",
    issuer: "NREMT",
  },
  {
    code: CREDENTIAL_TYPE_CODES.FEMA_SID,
    name: "FEMA SID",
    issuer: "FEMA",
  },
];

const reportingSystemDefinitions = [
  {
    code: REPORTING_SYSTEM_CODES.FIRE,
    name: "Kentucky Fire Commission",
  },
  {
    code: REPORTING_SYSTEM_CODES.KBEMS,
    name: "KBEMS / KEMSIS",
  },
  {
    code: REPORTING_SYSTEM_CODES.FEMA,
    name: "FEMA",
  },
];

// Version-one requirement mapping: which credential type each reporting
// system requires during student sign-in.
const reportingRequirementMapping = [
  [REPORTING_SYSTEM_CODES.FIRE, CREDENTIAL_TYPE_CODES.FFN],
  [REPORTING_SYSTEM_CODES.KBEMS, CREDENTIAL_TYPE_CODES.KEMSIS],
  [REPORTING_SYSTEM_CODES.FEMA, CREDENTIAL_TYPE_CODES.FEMA_SID],
] as const;

export async function seedReferenceData(
  transaction: DatabaseTransaction,
): Promise<void> {
  await transaction
    .insert(credentialTypes)
    .values(credentialTypeDefinitions)
    .onConflictDoUpdate({
      target: credentialTypes.code,
      set: {
        name: sql`excluded.name`,
        issuer: sql`excluded.issuer`,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  await transaction
    .insert(reportingSystems)
    .values(reportingSystemDefinitions)
    .onConflictDoUpdate({
      target: reportingSystems.code,
      set: {
        name: sql`excluded.name`,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  const credentialTypeRows = await transaction
    .select()
    .from(credentialTypes)
    .where(inArray(credentialTypes.code, Object.values(CREDENTIAL_TYPE_CODES)));
  const reportingSystemRows = await transaction
    .select()
    .from(reportingSystems)
    .where(
      inArray(reportingSystems.code, Object.values(REPORTING_SYSTEM_CODES)),
    );

  const credentialTypeByCode = new Map(
    credentialTypeRows.map((row) => [row.code, row.id]),
  );
  const reportingSystemByCode = new Map(
    reportingSystemRows.map((row) => [row.code, row.id]),
  );

  for (const [systemCode, credentialCode] of reportingRequirementMapping) {
    const reportingSystemId = reportingSystemByCode.get(systemCode);
    const credentialTypeId = credentialTypeByCode.get(credentialCode);
    if (!reportingSystemId || !credentialTypeId) {
      throw new Error(
        `Reference seed could not resolve system '${systemCode}' or credential '${credentialCode}'.`,
      );
    }

    const [requirementSet] = await transaction
      .insert(reportingRequirementSets)
      .values({ reportingSystemId, version: 1, isActive: true })
      .onConflictDoUpdate({
        target: [
          reportingRequirementSets.reportingSystemId,
          reportingRequirementSets.version,
        ],
        set: { isActive: true },
      })
      .returning({ id: reportingRequirementSets.id });
    if (!requirementSet) {
      throw new Error("Reference seed could not create a requirement set.");
    }

    await transaction
      .insert(reportingRequirements)
      .values({
        requirementSetId: requirementSet.id,
        kind: REPORTING_REQUIREMENT_KINDS.CREDENTIAL,
        credentialTypeId,
        isRequired: true,
      })
      .onConflictDoNothing();
  }
}
