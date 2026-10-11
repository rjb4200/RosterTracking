import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { finalizeClass } from "../../src/modules/classes/finalization";
import {
  createOpenClass,
  getClassDetail,
  updateClass,
  updateClassMtuUsage,
} from "../../src/modules/classes/services";
import { MTU_CATALOG_SEED } from "../../src/modules/reference/constants";
import {
  archiveMtuCatalogItem,
  createMtuCatalogItem,
  getMtuCatalogItem,
  listMtuCatalogItems,
  setMtuCatalogItemActive,
  updateMtuCatalogItem,
} from "../../src/modules/reference/services";
import {
  PERMISSIONS,
  ROLE_CODES,
} from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceReportingContexts,
  finalizationReportingStatuses,
  mtuCatalogItems,
  permissions,
  reportingRequirementSets,
  reportingSystems,
  rolePermissions,
  roles,
  students,
  trainingSites,
  userRoles,
  users,
} from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";
import { uniqueFfn } from "./support/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function createUser(db: Db, suffix: string, roleCode: string) {
  const [user] = await db
    .insert(users)
    .values({
      username: `mtu-${roleCode}-${suffix}`,
      displayName: roleCode,
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode));
  if (!user || !role) throw new Error("MTU fixture user failed.");
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  return user;
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

async function catalogItemId(db: Db, name: string) {
  const [item] = await db
    .select({ id: mtuCatalogItems.id })
    .from(mtuCatalogItems)
    .where(eq(mtuCatalogItems.name, name));
  if (!item) throw new Error(`MTU catalog item ${name} is missing.`);
  return item.id;
}

async function createMtuClass(
  db: Db,
  suffix: string,
  selections: {
    mtuEquipmentIds?: string[];
    mtuSupplyItems?: { itemId: string; quantity?: string | number }[];
    mtuTransportIds?: string[];
    mtuMileage?: string;
  } = {},
) {
  const instructor = await createUser(db, suffix, ROLE_CODES.INSTRUCTOR);
  const { systemId } = await activeSetId(db, "mtu");
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `MTU Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `MTU Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!site || !agency) throw new Error("MTU fixture references failed.");
  const created = await createOpenClass(db, instructor, {
    name: `MTU Course ${suffix}`,
    trainingSiteId: site.id,
    hostAgencyId: agency.id,
    deliveryMethod: "classroom",
    startsAt: "2026-09-10T09:00",
    creditedHours: 4,
    leadInstructorId: instructor.id,
    reportingSystemIds: [systemId],
    accessPinEnabled: false,
    mtuEquipmentUsed: "",
    mtuMileage: "",
    mtuUsedSupplies: "",
    ...selections,
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
    .values({ firstName: "Ada", lastName: "Lovelace", phone: `+1${digits}` })
    .returning({ id: students.id });
  if (!student) throw new Error("MTU fixture student failed.");
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
  if (!record) throw new Error("MTU fixture attendance failed.");
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

describeDatabase("MTU catalog and structured usage", () => {
  it("seeds the initial catalog once", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const items = await db.select().from(mtuCatalogItems);
    // Count only seeded entries so fixture rows from other runs cannot skew it.
    const seedNames = new Set(MTU_CATALOG_SEED.map((entry) => entry.name));
    const seeded = items.filter((item) => seedNames.has(item.name));
    expect(seeded.filter((item) => item.kind === "equipment")).toHaveLength(17);
    expect(seeded.filter((item) => item.kind === "supplies")).toHaveLength(7);
    expect(seeded.filter((item) => item.kind === "transport")).toHaveLength(3);
  });

  it("manages catalog items and revives a retired name", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const admin = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.ADMINISTRATOR,
    );
    const actor = { id: admin.id, username: admin.username };
    // A run-unique name so a leftover row from a previous run cannot collide
    // with the kind+name unique constraint.
    const name = `Test Gauze ${crypto.randomUUID().slice(0, 8)}`;

    const created = await createMtuCatalogItem(db, actor, {
      kind: "supplies",
      name,
      unitLabel: "each",
      perClassQty: "0",
      perStudentQty: "2",
      rounding: "ceil",
    });
    expect(created.kind).toBe("supplies");

    const listed = await listMtuCatalogItems(db, name);
    expect(listed).toHaveLength(1);

    await updateMtuCatalogItem(db, actor, created.id, {
      kind: "supplies",
      name,
      unitLabel: "roll",
      perClassQty: "1",
      perStudentQty: "1",
      rounding: "exact",
    });
    const updated = await getMtuCatalogItem(db, created.id);
    expect(updated?.unitLabel).toBe("roll");

    await setMtuCatalogItemActive(db, actor, created.id, false);
    expect((await getMtuCatalogItem(db, created.id))?.isActive).toBe(false);

    await archiveMtuCatalogItem(db, actor, created.id);
    expect((await getMtuCatalogItem(db, created.id))?.archivedAt).toBeTruthy();

    // Re-adding a retired name revives it instead of duplicating.
    const revived = await createMtuCatalogItem(db, actor, {
      kind: "supplies",
      name,
      unitLabel: "each",
      perClassQty: "0",
      perStudentQty: "2",
      rounding: "ceil",
    });
    expect(revived.id).toBe(created.id);
    expect(revived.isActive).toBe(true);
    expect(revived.archivedAt).toBeNull();
  });

  it("rejects a supply without a quantity rule", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = { id: crypto.randomUUID(), username: "admin" };
    await expect(
      createMtuCatalogItem(db, actor, {
        kind: "supplies",
        name: `Ruleless Supply ${crypto.randomUUID().slice(0, 8)}`,
        unitLabel: "",
      }),
    ).rejects.toThrow(/unit label/i);
  });

  it("grants mtu-catalog.manage to administrators and training majors", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const [permission] = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.code, PERMISSIONS.MTU_CATALOG_MANAGE));
    if (!permission) throw new Error("MTU catalog permission is missing.");
    const grants = await db
      .select({ roleCode: roles.code })
      .from(rolePermissions)
      .innerJoin(roles, eq(roles.id, rolePermissions.roleId))
      .where(eq(rolePermissions.permissionId, permission.id));
    const roleCodes = grants.map((grant) => grant.roleCode);
    expect(roleCodes).toContain(ROLE_CODES.ADMINISTRATOR);
    expect(roleCodes).toContain(ROLE_CODES.TRAINING_MAJOR);
    expect(roleCodes).not.toContain(ROLE_CODES.INSTRUCTOR);
  });

  it("records structured equipment and supplies with roster-based suggestions", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { setId } = await activeSetId(db, "mtu");
    const suction = await catalogItemId(db, "Suction unit");
    const gauze = await catalogItemId(db, "Roller Gauze");
    const { instructor, agency, classId } = await createMtuClass(db, suffix, {
      mtuEquipmentIds: [suction],
      mtuSupplyItems: [{ itemId: gauze }],
    });
    for (let index = 0; index < 3; index += 1) {
      await addActiveAttendance(db, {
        classId,
        agencyId: agency.id,
        requirementSetId: setId,
      });
    }

    const detail = await getClassDetail(db, instructor, classId);
    const items = detail.mtuUsage?.items ?? [];
    const equipment = items.find((item) => item.itemId === suction);
    const supply = items.find((item) => item.itemId === gauze);
    expect(equipment?.kind).toBe("equipment");
    expect(equipment?.quantity).toBeNull();
    expect(supply?.kind).toBe("supplies");
    expect(supply?.quantity).toBe(6);
    expect(supply?.source).toBe("suggested");
  });

  it("requires MTU confirmation to finalize and skips it for non-MTU classes", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { setId } = await activeSetId(db, "mtu");
    const chestSeal = await catalogItemId(db, "Chest Seal");
    const { instructor, agency, classId } = await createMtuClass(db, suffix, {
      mtuSupplyItems: [{ itemId: chestSeal }],
    });
    await addActiveAttendance(db, {
      classId,
      agencyId: agency.id,
      requirementSetId: setId,
    });

    await expect(
      finalizeClass(db, instructor, classId, {
        certified: true,
        typedName: "Test Instructor",
      }),
    ).rejects.toThrow(/confirm the mtu usage/i);

    const revision = await finalizeClass(
      db,
      instructor,
      classId,
      { certified: true, typedName: "Test Instructor" },
      {
        confirmed: true,
        equipmentIds: [],
        supplies: [{ itemId: chestSeal }],
      },
    );
    expect(revision.revisionNumber).toBe(1);

    // The confirmed usage is frozen (manual) and stays editable after lock
    // without changing the revision or participant count.
    const frozen = await getClassDetail(db, instructor, classId);
    const frozenSeal = frozen.mtuUsage?.items.find(
      (item) => item.itemId === chestSeal,
    );
    expect(frozenSeal?.source).toBe("manual");
    expect(frozenSeal?.quantity).toBe(1);

    await updateClassMtuUsage(db, instructor, classId, {
      equipmentUsed: "",
      mileage: "",
      usedSupplies: "",
      supplies: [{ itemId: chestSeal, quantity: "9" }],
    });
    const edited = await getClassDetail(db, instructor, classId);
    const editedSeal = edited.mtuUsage?.items.find(
      (item) => item.itemId === chestSeal,
    );
    expect(editedSeal?.quantity).toBe(9);
    expect(edited.mtuActiveParticipantCount).toBe(1);
    await retireRevision(db, revision.id);
  });

  it("skips the MTU confirmation for a non-MTU class", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { systemId, setId } = await activeSetId(db, "fire");
    const instructor = await createUser(db, suffix, ROLE_CODES.INSTRUCTOR);
    // Fire classes require an FFN-format number for every instructor.
    await db
      .update(users)
      .set({ ffn: uniqueFfn() })
      .where(eq(users.id, instructor.id));
    const [site] = await db
      .insert(trainingSites)
      .values({ name: `Non MTU Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const [agency] = await db
      .insert(agencies)
      .values({ name: `Non MTU Agency ${suffix}` })
      .returning({ id: agencies.id });
    if (!site || !agency) throw new Error("Non-MTU fixture references failed.");
    // A class that does not report to MTU still finalizes without the step.
    const created = await createOpenClass(db, instructor, {
      name: `Non MTU Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      deliveryMethod: "classroom",
      startsAt: "2026-09-10T09:00",
      creditedHours: 4,
      leadInstructorId: instructor.id,
      reportingSystemIds: [systemId],
      accessPinEnabled: false,
      mtuEquipmentUsed: "",
      mtuMileage: "",
      mtuUsedSupplies: "",
    });
    await addActiveAttendance(db, {
      classId: created.classRecord.id,
      agencyId: agency.id,
      requirementSetId: setId,
    });
    const revision = await finalizeClass(
      db,
      instructor,
      created.classRecord.id,
      { certified: true, typedName: "Test Instructor" },
    );
    expect(revision.revisionNumber).toBe(1);
    await retireRevision(db, revision.id);
  });

  it("requires mileage at creation only for a driving transport", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const van = await catalogItemId(db, "Ford Transit Van 15 passenger");
    const pov = await catalogItemId(db, "POV");

    // Van without a mileage estimate is rejected at creation.
    await expect(
      createMtuClass(db, `${suffix}-a`, {
        mtuTransportIds: [van],
        mtuMileage: "",
      }),
    ).rejects.toThrow(/mileage/i);

    // Van with a mileage estimate is accepted.
    const withVan = await createMtuClass(db, `${suffix}-b`, {
      mtuTransportIds: [van],
      mtuMileage: "120",
    });
    expect(withVan.classId).toBeTruthy();

    // POV alone needs no mileage.
    const withPov = await createMtuClass(db, `${suffix}-c`, {
      mtuTransportIds: [pov],
      mtuMileage: "",
    });
    expect(withPov.classId).toBeTruthy();

    // Editing is not enforced: select the van and blank the mileage.
    const detail = await getClassDetail(
      db,
      withVan.instructor,
      withVan.classId,
    );
    await expect(
      updateClass(db, withVan.instructor, withVan.classId, {
        name: detail.name ?? "",
        trainingSiteId: detail.trainingSiteId,
        hostAgencyId: detail.hostAgencyId,
        deliveryMethod: "classroom",
        reportingSystemIds: detail.reportingSystems.map((system) => system.id),
        accessPinEnabled: false,
        mtuEquipmentUsed: "",
        mtuMileage: "",
        mtuUsedSupplies: "",
        mtuTransportIds: [van],
      }),
    ).resolves.toBeTruthy();

    // Saving usage after the fact is not enforced either.
    await expect(
      updateClassMtuUsage(db, withVan.instructor, withVan.classId, {
        equipmentUsed: "",
        mileage: "",
        usedSupplies: "",
        transportIds: [van],
      }),
    ).resolves.toBeUndefined();
  });

  it("stores selections without supply quantities and resolves them at finalization", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { setId } = await activeSetId(db, "mtu");
    const gauze = await catalogItemId(db, "Roller Gauze");
    const { instructor, agency, classId } = await createMtuClass(db, suffix, {
      mtuSupplyItems: [{ itemId: gauze }],
    });
    for (let index = 0; index < 3; index += 1) {
      await addActiveAttendance(db, {
        classId,
        agencyId: agency.id,
        requirementSetId: setId,
      });
    }

    const detail = await getClassDetail(db, instructor, classId);
    const created = detail.mtuUsage?.items.find(
      (item) => item.itemId === gauze,
    );
    expect(created?.source).toBe("suggested");
    expect(created?.quantity).toBe(6);

    const revision = await finalizeClass(
      db,
      instructor,
      classId,
      { certified: true, typedName: "Test Instructor" },
      {
        confirmed: true,
        equipmentIds: [],
        supplies: [{ itemId: gauze }],
        transportIds: [],
      },
    );
    const after = await getClassDetail(db, instructor, classId);
    const frozen = after.mtuUsage?.items.find((item) => item.itemId === gauze);
    expect(frozen?.source).toBe("manual");
    expect(frozen?.quantity).toBe(6);
    await retireRevision(db, revision.id);
  });
});
