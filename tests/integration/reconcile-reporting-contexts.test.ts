import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  finalizeClass,
  reopenFinalizedClass,
} from "../../src/modules/classes/finalization";
import {
  createOpenClass,
  updateClass,
} from "../../src/modules/classes/services";
import {
  getRosterReadiness,
  validateRosterCompletion,
} from "../../src/modules/instructor-roster/services";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceCredentialSnapshots,
  attendanceReportingContexts,
  classReportingSystems,
  emailDeliveries,
  reportingRequirementSets,
  reportingSystems,
  students,
  trainingCodes,
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

const CERTIFICATE_TEMPLATE = "completion-certificate";

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

async function emsCategoryId(db: Db) {
  const [row] = await db
    .select({ id: trainingCodes.id })
    .from(trainingCodes)
    .where(eq(trainingCodes.kind, "ems"))
    .limit(1);
  if (!row) throw new Error("No EMS training category is seeded.");
  return row.id;
}

async function references(db: Db, suffix: string) {
  const instructor = await createStaffUser(db, {
    username: `rc-instructor-${suffix}`,
    displayName: "RC Instructor",
    roleCode: ROLE_CODES.INSTRUCTOR,
  });
  const admin = await createStaffUser(db, {
    username: `rc-admin-${suffix}`,
    displayName: "RC Admin",
    roleCode: ROLE_CODES.ADMINISTRATOR,
  });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `RC Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `RC Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!site || !agency) throw new Error("RC fixture references failed.");
  return { instructor, admin, site, agency };
}

function classInput(
  refs: Awaited<ReturnType<typeof references>>,
  reportingSystemIds: string[],
  extra: Record<string, unknown> = {},
) {
  return {
    name: "RC Course",
    trainingSiteId: refs.site.id,
    hostAgencyId: refs.agency.id,
    deliveryMethod: "classroom" as const,
    startsAt: "2026-09-10T09:00",
    creditedHours: 4,
    leadInstructorId: refs.instructor.id,
    reportingSystemIds,
    accessPinEnabled: false,
    ...extra,
  };
}

async function addAttendance(
  db: Db,
  input: {
    classId: string;
    agencyId: string;
    requirementSetIds: string[];
    email: string;
  },
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
      email: input.email,
    })
    .returning({ id: students.id });
  if (!student) throw new Error("RC fixture student failed.");
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
  if (!record) throw new Error("RC fixture attendance failed.");
  if (input.requirementSetIds.length > 0) {
    await db.insert(attendanceReportingContexts).values(
      input.requirementSetIds.map((requirementSetId) => ({
        attendanceId: record.id,
        requirementSetId,
      })),
    );
  }
  return record.id;
}

async function contextsOf(db: Db, attendanceId: string) {
  return db
    .select({
      setId: attendanceReportingContexts.requirementSetId,
      included: attendanceReportingContexts.included,
    })
    .from(attendanceReportingContexts)
    .where(eq(attendanceReportingContexts.attendanceId, attendanceId));
}

async function certificateDeliveries(db: Db, revisionId: string) {
  return db
    .select({ id: emailDeliveries.id })
    .from(emailDeliveries)
    .where(
      and(
        eq(emailDeliveries.referenceId, revisionId),
        eq(emailDeliveries.template, CERTIFICATE_TEMPLATE),
      ),
    );
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

describeDatabase("reporting context reconciliation", () => {
  it("finalizes after a destination is added and queues certificates", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: fireId, setId: fireSet } = await activeSetId(db, "fire");
    const { systemId: kbemsId } = await activeSetId(db, "kbems");

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [fireId]),
    });
    const classId = created.classRecord.id;
    await addAttendance(db, {
      classId,
      agencyId: refs.agency.id,
      requirementSetIds: [fireSet],
      email: `ada-${suffix}@example.com`,
    });

    await updateClass(
      db,
      refs.instructor,
      classId,
      classInput(refs, [fireId, kbemsId]),
    );

    const revision = await finalizeClass(db, refs.instructor, classId, {
      certified: true,
      typedName: "Test Instructor",
    });
    expect(revision.revisionNumber).toBe(1);
    expect((await certificateDeliveries(db, revision.id)).length).toBe(1);
  });

  it("reconciles readiness and finalization without a save", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: fireId, setId: fireSet } = await activeSetId(db, "fire");
    const { systemId: kbemsId } = await activeSetId(db, "kbems");

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [fireId]),
    });
    const classId = created.classRecord.id;
    await addAttendance(db, {
      classId,
      agencyId: refs.agency.id,
      requirementSetIds: [fireSet],
      email: `ada-${suffix}@example.com`,
    });

    // A destination change made without going through updateClass (for example
    // one recorded before this change shipped) leaves the context stale.
    await db
      .insert(classReportingSystems)
      .values({ classId, reportingSystemId: kbemsId });

    const readiness = await getRosterReadiness(db, refs.instructor, classId);
    expect(readiness.ready).toBe(true);

    const revision = await finalizeClass(db, refs.instructor, classId, {
      certified: true,
      typedName: "Test Instructor",
    });
    expect(revision.revisionNumber).toBe(1);
    expect((await certificateDeliveries(db, revision.id)).length).toBe(1);
  });

  it("removes the context for a deselected reporting system", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: fireId, setId: fireSet } = await activeSetId(db, "fire");
    const { systemId: kbemsId, setId: kbemsSet } = await activeSetId(
      db,
      "kbems",
    );

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [fireId]),
    });
    const classId = created.classRecord.id;
    const attendanceId = await addAttendance(db, {
      classId,
      agencyId: refs.agency.id,
      requirementSetIds: [fireSet],
      email: `ada-${suffix}@example.com`,
    });

    await updateClass(
      db,
      refs.instructor,
      classId,
      classInput(refs, [fireId, kbemsId]),
    );
    expect((await contextsOf(db, attendanceId)).length).toBe(2);

    await updateClass(db, refs.instructor, classId, classInput(refs, [fireId]));
    const remaining = await contextsOf(db, attendanceId);
    expect(remaining.map((row) => row.setId)).toEqual([fireSet]);
    expect(remaining.some((row) => row.setId === kbemsSet)).toBe(false);
  });

  it("includes every attendee for an added credential-free system without inventing facts", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: fireId, setId: fireSet } = await activeSetId(db, "fire");
    const { systemId: kbemsId, setId: kbemsSet } = await activeSetId(
      db,
      "kbems",
    );

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [fireId]),
    });
    const classId = created.classRecord.id;
    const attendanceId = await addAttendance(db, {
      classId,
      agencyId: refs.agency.id,
      requirementSetIds: [fireSet],
      email: `ada-${suffix}@example.com`,
    });

    await updateClass(
      db,
      refs.instructor,
      classId,
      classInput(refs, [fireId, kbemsId]),
    );

    const kbemsContext = (await contextsOf(db, attendanceId)).find(
      (row) => row.setId === kbemsSet,
    );
    expect(kbemsContext?.included).toBe(true);
    const snapshots = await db
      .select({ id: attendanceCredentialSnapshots.id })
      .from(attendanceCredentialSnapshots)
      .where(
        and(
          eq(attendanceCredentialSnapshots.attendanceId, attendanceId),
          eq(attendanceCredentialSnapshots.requirementSetId, kbemsSet),
        ),
      );
    expect(snapshots).toHaveLength(0);
  });

  it("excludes an attendee from an added credential system with no captured value", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: fireId, setId: fireSet } = await activeSetId(db, "fire");
    const { systemId: kbemsId, setId: kbemsSet } = await activeSetId(
      db,
      "kbems",
    );
    const emsCategoryIdValue = await emsCategoryId(db);

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [kbemsId], {
        name: "RC EMS Course",
        courseType: "continuing_education",
        objectives: "Airway",
        emsCategoryId: emsCategoryIdValue,
      }),
    });
    const classId = created.classRecord.id;
    const attendanceId = await addAttendance(db, {
      classId,
      agencyId: refs.agency.id,
      requirementSetIds: [kbemsSet],
      email: `ada-${suffix}@example.com`,
    });

    await updateClass(
      db,
      refs.instructor,
      classId,
      classInput(refs, [kbemsId, fireId], {
        name: "RC EMS Course",
        courseType: "continuing_education",
        objectives: "Airway",
        emsCategoryId: emsCategoryIdValue,
      }),
    );

    const fireContext = (await contextsOf(db, attendanceId)).find(
      (row) => row.setId === fireSet,
    );
    expect(fireContext?.included).toBe(false);
  });

  it("still refuses a roster whose reporting context is missing", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: fireId } = await activeSetId(db, "fire");

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [fireId]),
    });
    await addAttendance(db, {
      classId: created.classRecord.id,
      agencyId: refs.agency.id,
      requirementSetIds: [],
      email: `ada-${suffix}@example.com`,
    });

    await expect(
      db.transaction((transaction) =>
        validateRosterCompletion(transaction, created.classRecord.id),
      ),
    ).rejects.toThrow(/missing required reporting context/i);
  });

  it("finalizes a reopened class after a destination is added and queues certificates", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: fireId, setId: fireSet } = await activeSetId(db, "fire");
    const { systemId: kbemsId } = await activeSetId(db, "kbems");

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [fireId]),
    });
    const classId = created.classRecord.id;
    await addAttendance(db, {
      classId,
      agencyId: refs.agency.id,
      requirementSetIds: [fireSet],
      email: `ada-${suffix}@example.com`,
    });

    const first = await finalizeClass(db, refs.instructor, classId, {
      certified: true,
      typedName: "Test Instructor",
    });
    expect(first.revisionNumber).toBe(1);

    await reopenFinalizedClass(db, refs.admin, classId, "Adding EMS");
    await updateClass(
      db,
      refs.instructor,
      classId,
      classInput(refs, [fireId, kbemsId]),
    );

    const second = await finalizeClass(db, refs.instructor, classId, {
      certified: true,
      typedName: "Test Instructor",
    });
    expect(second.revisionNumber).toBe(2);
    expect((await certificateDeliveries(db, second.id)).length).toBe(1);
  });
});

describeDatabase("MTU requires an accreditation destination", () => {
  it("rejects creating an MTU-only class", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: mtuId } = await activeSetId(db, "mtu");

    await expect(
      createOpenClass(db, refs.instructor, {
        ...classInput(refs, [mtuId]),
      }),
    ).rejects.toThrow(/Fire or KBEMS alongside the Mobile Training Unit/);
  });

  it("allows MTU alongside Fire", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: mtuId } = await activeSetId(db, "mtu");
    const { systemId: fireId } = await activeSetId(db, "fire");

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [mtuId, fireId]),
    });
    expect(created.classRecord.id).toBeTruthy();
  });

  it("rejects removing the last accreditation destination from an MTU class", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const refs = await references(db, suffix);
    const { systemId: mtuId } = await activeSetId(db, "mtu");
    const { systemId: fireId } = await activeSetId(db, "fire");

    const created = await createOpenClass(db, refs.instructor, {
      ...classInput(refs, [mtuId, fireId]),
    });

    await expect(
      updateClass(
        db,
        refs.instructor,
        created.classRecord.id,
        classInput(refs, [mtuId]),
      ),
    ).rejects.toThrow(/Fire or KBEMS alongside the Mobile Training Unit/);
  });
});
