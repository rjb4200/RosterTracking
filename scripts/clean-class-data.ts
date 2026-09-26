import "dotenv/config";

import { eq, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import type { Database, DatabaseTransaction } from "../src/server/db/client";
import * as schema from "../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceAttestations,
  attendanceCredentialSnapshots,
  attendanceReportingContexts,
  attendanceRequiredFieldSnapshots,
  auditLogs,
  classComponents,
  classGuests,
  classInstructors,
  classReportingSystems,
  finalizationRevisions,
  publicRateLimitWindows,
  signInWorkflowStaging,
  studentAgencies,
  trainingClasses,
  trainingSites,
  userRoles,
  users,
} from "../src/server/db/schema";

/**
 * Operational data remediation, narrowed to what the schema permits.
 *
 * `finalization_revisions` carries `DO INSTEAD NOTHING` rules on UPDATE and
 * DELETE, so finalized revisions are immutable and permanent by design. A
 * finalized class cannot be removed either, because its revisions restrict the
 * delete. This script therefore removes only non-finalized rows and the
 * reference data left orphaned by them; finalized fixture revisions are left in
 * place and handled by the official-roster read path instead.
 */

const PRODUCTION_DATABASE_NAME = "RosterGenerator";

/** Non-finalized classes removed by explicit allow-list. Never matched by name. */
const DELETABLE_CLASS_IDS = [
  // E2E fixtures (non-finalized)
  "5e865b4f-6058-4330-b7ea-ff1051f3ead7", // draft
  // Human junk classes
  "fcd39044-57b9-483c-a90b-14a9c83ed52c", // cancelled
  "3fb19f1a-245c-4659-8b51-0684e8c55236", // cancelled
  "366ea260-d031-4d81-9649-1d9e1ad07f00", // cancelled
  "7f5ccb11-40ab-4fa7-bda9-5544990d711e", // cancelled
  "a273de9b-e72d-45a2-91aa-4f8226c5265a", // cancelled
  "bfb8fc27-fb42-4840-a4b0-30b4914599d1", // cancelled
  "f62873c7-49c3-4c8b-be6e-c0e68081bd9c", // cancelled
  "ea661a0f-ca0a-4757-b0a4-9986ff864118", // draft
  "49ce0cc6-d814-4037-af0b-b8028aad7aba", // open, E2E catalog
  "199930cf-a133-49c9-a4cd-4cc7b1bbe29e", // open, adfas
] as const;

/** Junk catalog rows removed once nothing references them. */
const JUNK_SITE_NAMES = ["adfas", "asdlkaf;sljk"] as const;

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

const apply = process.argv.includes("--apply");

function assertProductionTarget(url: string): void {
  const parsed = new URL(url);
  const databaseName = parsed.pathname.replace(/^\//, "");
  if (databaseName !== PRODUCTION_DATABASE_NAME) {
    throw new Error(
      `Refusing to run: DATABASE_URL_DIRECT resolves to "${databaseName}".`,
    );
  }
  console.log(
    `Target: host=${parsed.hostname} database=${databaseName} branch=br-patient-truth-ae7jcw9k`,
  );
}

async function countRows(
  database: Database,
  table: "classes" | "users" | "attendance",
) {
  if (table === "classes") {
    const [row] = await database
      .select({ n: sql<number>`count(*)::int` })
      .from(trainingClasses);
    return row?.n ?? 0;
  }
  if (table === "users") {
    const [row] = await database
      .select({ n: sql<number>`count(*)::int` })
      .from(users);
    return row?.n ?? 0;
  }
  const [row] = await database
    .select({ n: sql<number>`count(*)::int` })
    .from(attendance);
  return row?.n ?? 0;
}

async function snapshotState() {
  const [classes, users_, attendanceCount] = await Promise.all([
    countRows(db, "classes"),
    countRows(db, "users"),
    countRows(db, "attendance"),
  ]);
  const [e2eUsers] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(like(users.username, "e2e-%"));
  const [fixtureRevs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(finalizationRevisions)
    .where(eq(finalizationRevisions.encryptedSnapshot, "fixture"));
  const [junkSites] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(trainingSites)
    .where(inArray(trainingSites.name, [...JUNK_SITE_NAMES]));
  return {
    classes,
    users: users_,
    attendance: attendanceCount,
    e2eUsers: e2eUsers?.n ?? 0,
    fixtureRevisions: fixtureRevs?.n ?? 0,
    junkSites: junkSites?.n ?? 0,
  };
}

function assertNoFinalized(rows: { id: string; status: string }[]): void {
  const finalized = rows.filter((row) => row.status === "finalized");
  if (finalized.length) {
    throw new Error(
      `Allow-list contains finalized classes (immutable): ${finalized
        .map((row) => row.id)
        .join(", ")}`,
    );
  }
}

async function printPlan() {
  const rows = await db
    .select({
      id: trainingClasses.id,
      status: trainingClasses.status,
      siteId: trainingClasses.trainingSiteId,
      hostAgencyId: trainingClasses.hostAgencyId,
    })
    .from(trainingClasses)
    .where(inArray(trainingClasses.id, [...DELETABLE_CLASS_IDS]));

  const missing = DELETABLE_CLASS_IDS.filter(
    (id) => !rows.some((row) => row.id === id),
  );
  if (missing.length) {
    console.log(`Allow-list ids already absent (ok): ${missing.join(", ")}`);
  }
  assertNoFinalized(rows);

  const ids = rows.map((row) => row.id);
  const [attendanceRows, revisionRows] = await Promise.all([
    ids.length
      ? db
          .select({ id: attendance.id })
          .from(attendance)
          .where(inArray(attendance.classId, ids))
      : Promise.resolve([]),
    ids.length
      ? db
          .select({ id: finalizationRevisions.id })
          .from(finalizationRevisions)
          .where(inArray(finalizationRevisions.classId, ids))
      : Promise.resolve([]),
  ]);

  if (revisionRows.length) {
    throw new Error(
      `Deletable classes unexpectedly own ${revisionRows.length} revisions; aborting.`,
    );
  }

  const e2eUsers = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(like(users.username, "e2e-%"));

  const affectedSiteIds = [
    ...new Set(
      rows.map((row) => row.siteId).filter((id): id is string => !!id),
    ),
  ];

  console.log("--- deletion plan (non-finalized only) ---");
  console.log(`Classes to delete (${rows.length}):`);
  for (const row of rows) console.log(`  ${row.id} [${row.status}]`);
  console.log(`Attendance rows under them: ${attendanceRows.length}`);
  console.log(`Junk sites to delete: ${JUNK_SITE_NAMES.join(", ")}`);

  return {
    ids,
    e2eUserIds: e2eUsers.map((row) => row.id),
    e2eUserNames: e2eUsers.map((row) => row.username),
    affectedSiteIds,
  };
}

async function deleteClassesInTransaction(
  transaction: DatabaseTransaction,
  classIds: string[],
) {
  if (!classIds.length) return;
  const attendanceRows = await transaction
    .select({ id: attendance.id })
    .from(attendance)
    .where(inArray(attendance.classId, classIds));
  const attendanceIds = attendanceRows.map((row) => row.id);

  if (attendanceIds.length) {
    await transaction
      .delete(attendanceAttestations)
      .where(inArray(attendanceAttestations.attendanceId, attendanceIds));
    await transaction
      .delete(attendanceReportingContexts)
      .where(inArray(attendanceReportingContexts.attendanceId, attendanceIds));
    await transaction
      .delete(attendanceRequiredFieldSnapshots)
      .where(
        inArray(attendanceRequiredFieldSnapshots.attendanceId, attendanceIds),
      );
    await transaction
      .delete(attendanceCredentialSnapshots)
      .where(
        inArray(attendanceCredentialSnapshots.attendanceId, attendanceIds),
      );
    await transaction
      .delete(attendance)
      .where(inArray(attendance.id, attendanceIds));
  }

  await transaction
    .delete(classGuests)
    .where(inArray(classGuests.classId, classIds));
  await transaction
    .delete(classComponents)
    .where(inArray(classComponents.classId, classIds));
  await transaction
    .delete(classInstructors)
    .where(inArray(classInstructors.classId, classIds));
  await transaction
    .delete(classReportingSystems)
    .where(inArray(classReportingSystems.classId, classIds));
  await transaction
    .delete(publicRateLimitWindows)
    .where(inArray(publicRateLimitWindows.classId, classIds));
  await transaction
    .delete(signInWorkflowStaging)
    .where(inArray(signInWorkflowStaging.classId, classIds));
  const deleted = await transaction
    .delete(trainingClasses)
    .where(inArray(trainingClasses.id, classIds))
    .returning({ id: trainingClasses.id });
  return deleted.length;
}

async function deleteOrphanedSites(
  transaction: DatabaseTransaction,
  siteIds: string[],
) {
  const orphanSites = await orphanSiteIds(transaction, [
    ...siteIds,
    ...(await junkSiteIds(transaction)),
  ]);
  if (orphanSites.length) {
    await transaction
      .delete(trainingSites)
      .where(inArray(trainingSites.id, orphanSites));
  }
  return { sites: orphanSites.length };
}

async function orphanSiteIds(
  transaction: DatabaseTransaction,
  ids: string[],
): Promise<string[]> {
  const unique = [...new Set(ids)];
  const result: string[] = [];
  for (const id of unique) {
    const [row] = await transaction
      .select({ n: sql<number>`count(*)::int` })
      .from(trainingClasses)
      .where(eq(trainingClasses.trainingSiteId, id));
    if ((row?.n ?? 0) === 0) result.push(id);
  }
  return result;
}

async function junkSiteIds(
  transaction: DatabaseTransaction,
): Promise<string[]> {
  const rows = await transaction
    .select({ id: trainingSites.id })
    .from(trainingSites)
    .where(inArray(trainingSites.name, [...JUNK_SITE_NAMES]));
  return rows.map((row) => row.id);
}

async function deleteE2eUsersWithoutReferences(
  transaction: DatabaseTransaction,
  userIds: string[],
) {
  let deleted = 0;
  for (const id of userIds) {
    const [
      audit,
      roleRows,
      instructorRows,
      removedRows,
      adjustedRows,
      reopenedRows,
    ] = await Promise.all([
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(eq(auditLogs.actorUserId, id)),
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(userRoles)
        .where(eq(userRoles.userId, id)),
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(classInstructors)
        .where(eq(classInstructors.userId, id)),
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(attendance)
        .where(eq(attendance.removedByUserId, id)),
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(attendance)
        .where(eq(attendance.creditAdjustedByUserId, id)),
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(finalizationRevisions)
        .where(eq(finalizationRevisions.finalizedByUserId, id)),
    ]);
    const blockers =
      (audit[0]?.n ?? 0) +
      (roleRows[0]?.n ?? 0) +
      (instructorRows[0]?.n ?? 0) +
      (removedRows[0]?.n ?? 0) +
      (adjustedRows[0]?.n ?? 0) +
      (reopenedRows[0]?.n ?? 0);
    if (blockers > 0) continue;
    await transaction.delete(userRoles).where(eq(userRoles.userId, id));
    const rows = await transaction
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    deleted += rows.length;
  }
  return deleted;
}

async function deleteOrphanedE2eAgencies(transaction: DatabaseTransaction) {
  const rows = await transaction
    .select({ id: agencies.id })
    .from(agencies)
    .where(like(agencies.name, "E2E %"));
  let deleted = 0;
  for (const agency of rows) {
    const [hostRefs, membershipRefs, attendanceRefs] = await Promise.all([
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(trainingClasses)
        .where(eq(trainingClasses.hostAgencyId, agency.id)),
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(studentAgencies)
        .where(eq(studentAgencies.agencyId, agency.id)),
      transaction
        .select({ n: sql<number>`count(*)::int` })
        .from(attendance)
        .where(eq(attendance.agencyId, agency.id)),
    ]);
    const blockers =
      (hostRefs[0]?.n ?? 0) +
      (membershipRefs[0]?.n ?? 0) +
      (attendanceRefs[0]?.n ?? 0);
    if (blockers > 0) continue;
    await transaction.delete(agencies).where(eq(agencies.id, agency.id));
    deleted += 1;
  }
  return deleted;
}

async function main() {
  assertProductionTarget(directUrl);
  console.log("Before:", JSON.stringify(await snapshotState()));

  const plan = await printPlan();

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to delete.");
    return;
  }

  const result = await db.transaction(async (transaction) => {
    const classes = await deleteClassesInTransaction(transaction, plan.ids);
    const catalog = await deleteOrphanedSites(
      transaction,
      plan.affectedSiteIds,
    );
    const usersDeleted = await deleteE2eUsersWithoutReferences(
      transaction,
      plan.e2eUserIds,
    );
    const agenciesDeleted = await deleteOrphanedE2eAgencies(transaction);
    return {
      classes,
      sites: catalog.sites,
      users: usersDeleted,
      agencies: agenciesDeleted,
    };
  });

  console.log("Deleted:", JSON.stringify(result));
  console.log(
    "E2E users retained (still referenced by immutable revisions):",
    JSON.stringify(plan.e2eUserNames),
  );
  console.log("After:", JSON.stringify(await snapshotState()));
}

try {
  await main();
} finally {
  await pool.end();
}
