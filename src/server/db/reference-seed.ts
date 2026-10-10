import { inArray, sql } from "drizzle-orm";

import {
  AGENCY_TAG_CODES,
  AGENCY_TAG_NAMES,
  CREDENTIAL_TYPE_CODES,
  MTU_CATALOG_SEED,
  REPORTING_REQUIREMENT_KINDS,
  REPORTING_SYSTEM_CODES,
} from "@/modules/reference/constants";

import type { DatabaseTransaction } from "./client";
import {
  agencyTags,
  credentialTypes,
  mtuCatalogItems,
  reportingRequirementSets,
  reportingRequirements,
  reportingSystems,
} from "./schema";

const credentialTypeDefinitions = [
  {
    code: CREDENTIAL_TYPE_CODES.FFN,
    name: "Kentucky Firefighter Number",
    issuer: "Kentucky Fire Commission",
    isActive: true,
  },
  {
    code: CREDENTIAL_TYPE_CODES.KEMSIS,
    name: "KEMSIS ID",
    issuer: "KBEMS",
    isActive: true,
  },
  {
    code: CREDENTIAL_TYPE_CODES.NREMT,
    name: "NREMT Number",
    issuer: "NREMT",
    isActive: true,
  },
  {
    // FEMA reporting was retired; the row is kept for historical records.
    code: CREDENTIAL_TYPE_CODES.FEMA_SID,
    name: "FEMA SID",
    issuer: "FEMA",
    isActive: false,
  },
];

const agencyTagDefinitions = Object.values(AGENCY_TAG_CODES).map((code) => ({
  code,
  name: AGENCY_TAG_NAMES[code] ?? code,
  isActive: true,
}));

const reportingSystemDefinitions = [
  {
    code: REPORTING_SYSTEM_CODES.FIRE,
    name: "Kentucky Fire Commission",
    isActive: true,
  },
  {
    code: REPORTING_SYSTEM_CODES.KBEMS,
    name: "KBEMS / KEMSIS",
    isActive: true,
  },
  {
    code: REPORTING_SYSTEM_CODES.MTU,
    name: "Mobile Training Unit",
    isActive: true,
  },
  {
    // FEMA is deactivated, not deleted: existing revisions still reference it.
    code: REPORTING_SYSTEM_CODES.FEMA,
    name: "FEMA",
    isActive: false,
  },
];

// Version-one requirement mapping: which credential type each reporting
// system requires during student sign-in.
const reportingRequirementMapping = [
  [REPORTING_SYSTEM_CODES.FIRE, CREDENTIAL_TYPE_CODES.FFN],
  [REPORTING_SYSTEM_CODES.KBEMS, CREDENTIAL_TYPE_CODES.KEMSIS],
] as const;

// Destinations that require no student credential or field still need an
// active requirement set so class requirement resolution can resolve them.
const emptyRequirementSystemCodes = [REPORTING_SYSTEM_CODES.MTU] as const;

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
        isActive: sql`excluded.is_active`,
        updatedAt: new Date(),
      },
    });

  await transaction
    .insert(agencyTags)
    .values(agencyTagDefinitions)
    .onConflictDoUpdate({
      target: agencyTags.code,
      set: {
        name: sql`excluded.name`,
        isActive: sql`excluded.is_active`,
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
        isActive: sql`excluded.is_active`,
        updatedAt: new Date(),
      },
    });

  // The initial Mobile Training Unit catalog. Inserted with do-nothing on
  // conflict so re-running the seed (for example a test reset) repopulates a
  // cleared catalog without overwriting staff edits to existing entries.
  await transaction
    .insert(mtuCatalogItems)
    .values(
      MTU_CATALOG_SEED.map((entry) => ({
        kind: entry.kind,
        name: entry.name,
        unitLabel: entry.unitLabel,
        perClassQty:
          entry.perClassQty === null ? null : String(entry.perClassQty),
        perStudentQty:
          entry.perStudentQty === null ? null : String(entry.perStudentQty),
        rounding: entry.rounding,
        sortOrder: entry.sortOrder,
      })),
    )
    .onConflictDoNothing();

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

  for (const systemCode of emptyRequirementSystemCodes) {
    const reportingSystemId = reportingSystemByCode.get(systemCode);
    if (!reportingSystemId) {
      throw new Error(
        `Reference seed could not resolve system '${systemCode}'.`,
      );
    }
    await transaction
      .insert(reportingRequirementSets)
      .values({ reportingSystemId, version: 1, isActive: true })
      .onConflictDoUpdate({
        target: [
          reportingRequirementSets.reportingSystemId,
          reportingRequirementSets.version,
        ],
        set: { isActive: true },
      });
  }
}
