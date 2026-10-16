import { and, eq, inArray, ne, or, sql } from "drizzle-orm";

import {
  AGENCY_TAG_CODES,
  AGENCY_TAG_NAMES,
  CREDENTIAL_TYPE_CODES,
  EMS_CATEGORY_SEED,
  EMS_CATEGORY_SOURCE_REVISION,
  EMS_FIRE_CATEGORY_MAP,
  MTU_CATALOG_SEED,
  REPORTING_SYSTEM_CODES,
  TRAINING_CATEGORY_KINDS,
} from "@/modules/reference/constants";
import { FFN_VALUE_PATTERN } from "@/modules/reference/credential-format";

import type { DatabaseTransaction } from "./client";
import {
  agencyTags,
  credentialTypes,
  mtuCatalogItems,
  reportingRequirementSets,
  reportingSystems,
  trainingCodes,
} from "./schema";

const credentialTypeDefinitions = [
  {
    code: CREDENTIAL_TYPE_CODES.FFN,
    name: "Kentucky Firefighter Number",
    issuer: "Kentucky Fire Commission",
    valuePattern: FFN_VALUE_PATTERN,
    isActive: true,
  },
  {
    code: CREDENTIAL_TYPE_CODES.KEMSIS,
    name: "KEMSIS ID",
    issuer: "KBEMS",
    valuePattern: null,
    isActive: true,
  },
  {
    code: CREDENTIAL_TYPE_CODES.NREMT,
    name: "NREMT Number",
    issuer: "NREMT",
    valuePattern: null,
    isActive: true,
  },
  {
    // FEMA reporting was retired; the row is kept for historical records.
    code: CREDENTIAL_TYPE_CODES.FEMA_SID,
    name: "FEMA SID",
    issuer: "FEMA",
    valuePattern: null,
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

// Version two separates destination membership from admission to a class.
// The version-one sets remain available for historical attendance snapshots.
const reportingInclusionRules = [
  {
    systemCode: REPORTING_SYSTEM_CODES.FIRE,
    mode: "credential",
    credentialCode: CREDENTIAL_TYPE_CODES.FFN,
  },
  {
    systemCode: REPORTING_SYSTEM_CODES.KBEMS,
    mode: "all",
    credentialCode: null,
  },
  {
    systemCode: REPORTING_SYSTEM_CODES.MTU,
    mode: "none",
    credentialCode: null,
  },
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
        valuePattern: sql`excluded.value_pattern`,
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
        requiresMileage: entry.requiresMileage ?? null,
        sortOrder: entry.sortOrder,
      })),
    )
    .onConflictDoNothing();

  // The shipped EMS category list. Inserted with do-nothing on identity so a
  // re-run repopulates a cleared catalog without overwriting staff edits.
  await transaction
    .insert(trainingCodes)
    .values(
      EMS_CATEGORY_SEED.map((entry) => ({
        kind: TRAINING_CATEGORY_KINDS.EMS,
        code: entry.name,
        title: entry.name,
        categoryGroup: entry.categoryGroup,
        sortOrder: entry.sortOrder,
        sourceRevision: EMS_CATEGORY_SOURCE_REVISION,
      })),
    )
    .onConflictDoNothing({
      target: [
        trainingCodes.kind,
        trainingCodes.code,
        trainingCodes.sourceRevision,
      ],
    });

  // Pair matching Fire codes and EMS categories symmetrically so a value filled
  // on one roster can pre-fill the other.
  await applyTrainingCategoryMappings(transaction);

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

  for (const { systemCode, mode, credentialCode } of reportingInclusionRules) {
    const reportingSystemId = reportingSystemByCode.get(systemCode);
    const credentialTypeId = credentialCode
      ? credentialTypeByCode.get(credentialCode)
      : null;
    if (!reportingSystemId || (credentialCode && !credentialTypeId)) {
      throw new Error(
        `Reference seed could not resolve system '${systemCode}' or credential '${credentialCode}'.`,
      );
    }
    await transaction
      .update(reportingRequirementSets)
      .set({ isActive: false })
      .where(
        and(
          eq(reportingRequirementSets.reportingSystemId, reportingSystemId),
          ne(reportingRequirementSets.version, 2),
          eq(reportingRequirementSets.isActive, true),
        ),
      );
    await transaction
      .insert(reportingRequirementSets)
      .values({
        reportingSystemId,
        version: 2,
        isActive: true,
        inclusionMode: mode,
        inclusionCredentialTypeId: credentialTypeId,
      })
      .onConflictDoUpdate({
        target: [
          reportingRequirementSets.reportingSystemId,
          reportingRequirementSets.version,
        ],
        set: {
          isActive: true,
          inclusionMode: mode,
          inclusionCredentialTypeId: credentialTypeId,
        },
      });
  }
}

/**
 * Pairs each matching Fire code and EMS category symmetrically. Exported so a
 * Fire-list import can re-apply the mapping after the codes it references
 * arrive, since those codes land after the reference seed runs.
 */
export async function applyTrainingCategoryMappings(
  transaction: DatabaseTransaction,
): Promise<void> {
  for (const pair of EMS_FIRE_CATEGORY_MAP) {
    const rows = await transaction
      .select({ id: trainingCodes.id, kind: trainingCodes.kind })
      .from(trainingCodes)
      .where(
        or(
          and(
            eq(trainingCodes.kind, TRAINING_CATEGORY_KINDS.FIRE),
            eq(trainingCodes.code, pair.fireCode),
          ),
          and(
            eq(trainingCodes.kind, TRAINING_CATEGORY_KINDS.EMS),
            eq(trainingCodes.code, pair.emsName),
          ),
        ),
      );
    const fire = rows.find((row) => row.kind === TRAINING_CATEGORY_KINDS.FIRE);
    const ems = rows.find((row) => row.kind === TRAINING_CATEGORY_KINDS.EMS);
    if (!fire || !ems) continue;
    await transaction
      .update(trainingCodes)
      .set({ mapsToId: ems.id })
      .where(eq(trainingCodes.id, fire.id));
    await transaction
      .update(trainingCodes)
      .set({ mapsToId: fire.id })
      .where(eq(trainingCodes.id, ems.id));
  }
}
