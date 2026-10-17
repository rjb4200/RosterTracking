import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  finalizeClass,
  getFinalizationHistory,
} from "../../src/modules/classes/finalization";
import {
  createOpenClass,
  getClassDetail,
  updateClass,
  updateClassMtuUsage,
} from "../../src/modules/classes/services";
import { decryptCredential } from "../../src/modules/reference/crypto";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceReportingContexts,
  finalizationReportingStatuses,
  finalizationRevisions,
  reportingRequirementSets,
  reportingRequirements,
  reportingSystems,
  students,
  trainingClasses,
  trainingSites,
} from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";
import { createStaffUser } from "./support/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function createUser(db: Db, suffix: string, roleCode: string) {
  return createStaffUser(db, {
    username: `${roleCode}-${suffix}`,
    displayName: roleCode,
    roleCode,
  });
}

async function createClassFixture(
  db: Db,
  suffix: string,
  reportingSystemIds: string[],
) {
  const instructor = await createUser(db, suffix, ROLE_CODES.INSTRUCTOR);
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Destination Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Destination Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!site || !agency) {
    throw new Error("Destination fixture references failed.");
  }
  const created = await createOpenClass(db, instructor, {
    name: `Destination Course ${suffix}`,
    trainingSiteId: site.id,
    hostAgencyId: agency.id,
    deliveryMethod: "classroom",
    startsAt: "2026-09-10T09:00",
    creditedHours: 4,
    leadInstructorId: instructor.id,
    reportingSystemIds,
    accessPinEnabled: false,
    mtuEquipmentUsed: "Trailer 4",
    mtuMileage: "120",
    mtuUsedSupplies: "Gloves",
  });
  return { instructor, agency, classId: created.classRecord.id };
}

async function addActiveAttendance(
  db: Db,
  input: { classId: string; agencyId: string; requirementSetId: string },
) {
  const digits = crypto
    .randomUUID()
    .replace(/\D/g, "")
    .padEnd(10, "0")
    .slice(0, 10);
  const [student] = await db
    .insert(students)
    .values({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: `+1${digits}`,
    })
    .returning({ id: students.id });
  if (!student) throw new Error("Destination fixture student failed.");
  const [record] = await db
    .insert(attendance)
    .values({
      classId: input.classId,
      studentId: student.id,
      agencyId: input.agencyId,
      idempotencyKey: crypto.randomUUID(),
      payloadFingerprint: "fixture",
      creditedHours: "4",
    })
    .returning({ id: attendance.id });
  if (!record) throw new Error("Destination fixture attendance failed.");
  await db.insert(attendanceReportingContexts).values({
    attendanceId: record.id,
    requirementSetId: input.requirementSetId,
  });
}

// The reporting queue is shared across test files, so finalized fixture work is
// retired after each test to keep unrelated pending work out of other assertions.
async function retireRevision(db: Db, revisionId: string) {
  await db
    .update(finalizationReportingStatuses)
    .set({ status: "not_required", updatedAt: new Date() })
    .where(eq(finalizationReportingStatuses.revisionId, revisionId));
}

async function activeSetId(db: Db, code: string) {
  const [system] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(eq(reportingSystems.code, code));
  if (!system) throw new Error(`Reporting system ${code} is missing.`);
  const [set] = await db
    .select({ id: reportingRequirementSets.id })
    .from(reportingRequirementSets)
    .where(
      and(
        eq(reportingRequirementSets.reportingSystemId, system.id),
        eq(reportingRequirementSets.isActive, true),
      ),
    );
  if (!set) throw new Error(`Reporting system ${code} has no active set.`);
  return { systemId: system.id, setId: set.id };
}

beforeAll(async () => {
  if (!pool) return;
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.transaction(seedFoundation);
  await db.transaction(seedReferenceData);
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("reporting destinations", () => {
  it("deactivates FEMA and activates MTU with an empty requirement set", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const systems = await db.select().from(reportingSystems);
    const byCode = new Map(systems.map((system) => [system.code, system]));

    expect(byCode.get("fire")?.isActive).toBe(true);
    expect(byCode.get("kbems")?.isActive).toBe(true);
    expect(byCode.get("mtu")?.isActive).toBe(true);
    expect(byCode.get("fema")?.isActive).toBe(false);

    const mtu = byCode.get("mtu");
    if (!mtu) throw new Error("MTU reporting system is missing.");
    const [mtuSet] = await db
      .select({ id: reportingRequirementSets.id })
      .from(reportingRequirementSets)
      .where(
        and(
          eq(reportingRequirementSets.reportingSystemId, mtu.id),
          eq(reportingRequirementSets.isActive, true),
        ),
      );
    expect(mtuSet).toBeTruthy();
    const requirements = await db
      .select({ id: reportingRequirements.id })
      .from(reportingRequirements)
      .where(eq(reportingRequirements.requirementSetId, mtuSet?.id ?? ""));
    expect(requirements).toHaveLength(0);
  });

  it("persists and updates MTU usage, then rejects edits after finalization", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { systemId } = await activeSetId(db, "mtu");
    const { systemId: fireSystemId } = await activeSetId(db, "fire");
    const { instructor, classId } = await createClassFixture(db, suffix, [
      systemId,
      fireSystemId,
    ]);

    const detail = await getClassDetail(db, instructor, classId);
    expect(detail.mtuUsage).toMatchObject({
      equipmentUsed: "Trailer 4",
      mileage: "120",
      usedSupplies: "Gloves",
    });

    await updateClass(db, instructor, classId, {
      name: detail.name ?? "",
      trainingSiteId: detail.trainingSiteId,
      hostAgencyId: detail.hostAgencyId,
      deliveryMethod: "classroom",
      reportingSystemIds: [systemId, fireSystemId],
      accessPinEnabled: false,
      mtuEquipmentUsed: "",
      mtuMileage: "150",
      mtuUsedSupplies: "",
    });
    const updated = await getClassDetail(db, instructor, classId);
    expect(updated.mtuUsage).toMatchObject({
      equipmentUsed: null,
      mileage: "150",
      usedSupplies: null,
    });

    await db
      .update(trainingClasses)
      .set({ status: "finalized" })
      .where(eq(trainingClasses.id, classId));
    await expect(
      updateClass(db, instructor, classId, {
        name: detail.name ?? "",
        trainingSiteId: detail.trainingSiteId,
        hostAgencyId: detail.hostAgencyId,
        deliveryMethod: "classroom",
        reportingSystemIds: [systemId, fireSystemId],
        accessPinEnabled: false,
        mtuMileage: "999",
      }),
    ).rejects.toThrow(/cannot be edited/i);
  });

  it("treats MTU usage as operational: editable after finalization and not in the revision", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { systemId, setId } = await activeSetId(db, "mtu");
    const { systemId: fireSystemId } = await activeSetId(db, "fire");
    const { instructor, agency, classId } = await createClassFixture(
      db,
      suffix,
      [systemId, fireSystemId],
    );
    await addActiveAttendance(db, {
      classId,
      agencyId: agency.id,
      requirementSetId: setId,
    });

    const revision = await finalizeClass(
      db,
      instructor,
      classId,
      {
        certified: true,
        typedName: "Test Instructor",
      },
      { confirmed: true, equipmentIds: [], supplies: [] },
    );
    const [row] = await db
      .select({ encryptedSnapshot: finalizationRevisions.encryptedSnapshot })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    if (!row) throw new Error("Finalization revision was not stored.");
    const snapshot = JSON.parse(decryptCredential(row.encryptedSnapshot));
    expect(snapshot.mtuUsage).toBeUndefined();

    // MTU is operational: it changes after finalization without reopening.
    await updateClassMtuUsage(db, instructor, classId, {
      equipmentUsed: "",
      mileage: "175",
      usedSupplies: "",
    });
    const detail = await getClassDetail(db, instructor, classId);
    expect(detail.mtuUsage).toMatchObject({
      equipmentUsed: null,
      mileage: "175",
      usedSupplies: null,
    });
    await retireRevision(db, revision.id);
  });

  it("keeps a deactivated FEMA destination readable in finalization history", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { systemId, setId } = await activeSetId(db, "fire");
    const { instructor, agency, classId } = await createClassFixture(
      db,
      suffix,
      [systemId],
    );
    await addActiveAttendance(db, {
      classId,
      agencyId: agency.id,
      requirementSetId: setId,
    });
    await db
      .update(trainingClasses)
      .set({ status: "open" })
      .where(eq(trainingClasses.id, classId));
    const revision = await finalizeClass(db, instructor, classId, {
      certified: true,
      typedName: "Test Instructor",
    });

    const [fema] = await db
      .select({ id: reportingSystems.id })
      .from(reportingSystems)
      .where(eq(reportingSystems.code, "fema"));
    if (!fema) throw new Error("FEMA reporting system is missing.");
    await db.insert(finalizationReportingStatuses).values({
      revisionId: revision.id,
      reportingSystemId: fema.id,
      status: "pending",
    });

    const history = await getFinalizationHistory(db, instructor, classId);
    const destinations = history.flatMap((entry) => entry.destinations);
    expect(
      destinations.some((destination) => destination.systemName === "FEMA"),
    ).toBe(true);
    await retireRevision(db, revision.id);
  });
});
