import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  listReportingQueue,
  updateReportingDestination,
} from "../../src/modules/classes/finalization";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  auditLogs,
  classComponents,
  classInstructors,
  courses,
  finalizationReportingStatuses,
  finalizationRevisions,
  reportingSystems,
  roles,
  trainingClasses,
  trainingSites,
  userRoles,
  users,
} from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

async function createUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  suffix: string,
  roleCode: string,
) {
  const [user] = await db
    .insert(users)
    .values({
      username: `${roleCode}-${suffix}`,
      displayName: roleCode,
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode));
  if (!user || !role)
    throw new Error("Reporting fixture user creation failed.");
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  return user;
}

async function createReportingClassFixture(
  db: ReturnType<typeof drizzle<typeof schema>>,
  suffix: string,
) {
  const instructor = await createUser(
    db,
    `${suffix}-instructor`,
    ROLE_CODES.INSTRUCTOR,
  );
  const [course] = await db
    .insert(courses)
    .values({ name: `Supersede Course ${suffix}` })
    .returning({ id: courses.id });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Supersede Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Supersede Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [fire] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(eq(reportingSystems.code, "fire"));
  if (!course || !site || !agency || !fire)
    throw new Error("Supersession fixture creation failed.");
  const [classRecord] = await db
    .insert(trainingClasses)
    .values({
      courseId: course.id,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      createdByUserId: instructor.id,
      deliveryMethod: "classroom",
      status: "finalized",
      signInTokenHash: crypto.randomUUID(),
    })
    .returning({ id: trainingClasses.id });
  if (!classRecord) throw new Error("Supersession fixture class failed.");
  await db.insert(classComponents).values({
    classId: classRecord.id,
    startsAt: new Date("2026-09-14T13:00:00Z"),
    endsAt: new Date("2026-09-14T17:00:00Z"),
    creditedHours: "4",
  });
  await db.insert(classInstructors).values({
    classId: classRecord.id,
    userId: instructor.id,
    isLead: true,
  });
  return {
    classId: classRecord.id,
    instructorId: instructor.id,
    fireId: fire.id,
  };
}

async function addRevision(
  db: ReturnType<typeof drizzle<typeof schema>>,
  input: {
    classId: string;
    instructorId: string;
    revisionNumber: number;
    fireId: string;
    fireStatus: string;
  },
) {
  const [revision] = await db
    .insert(finalizationRevisions)
    .values({
      classId: input.classId,
      revisionNumber: input.revisionNumber,
      finalizedByUserId: input.instructorId,
      encryptedSnapshot: "fixture",
      summary: {},
    })
    .returning({ id: finalizationRevisions.id });
  if (!revision) throw new Error("Supersession fixture revision failed.");
  await db.insert(finalizationReportingStatuses).values({
    revisionId: revision.id,
    reportingSystemId: input.fireId,
    status: input.fireStatus,
  });
  return revision.id;
}

// The queue is shared, so fixture destinations are retired after each test to
// keep unrelated pending work out of other assertions.
async function retireRevisions(
  db: ReturnType<typeof drizzle<typeof schema>>,
  revisionIds: string[],
) {
  if (!revisionIds.length) return;
  await db
    .update(finalizationReportingStatuses)
    .set({ status: "not_required", updatedAt: new Date() })
    .where(inArray(finalizationReportingStatuses.revisionId, revisionIds));
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

describeDatabase("finalization reporting queue", () => {
  it("tracks destination work independently and filters the reporting queue", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const reporter = await createUser(db, suffix, ROLE_CODES.TRAINING_MAJOR);
    const instructor = await createUser(db, suffix, ROLE_CODES.INSTRUCTOR);
    const [course] = await db
      .insert(courses)
      .values({ name: `Reporting Course ${suffix}` })
      .returning({ id: courses.id });
    const [site] = await db
      .insert(trainingSites)
      .values({ name: `Reporting Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const [agency] = await db
      .insert(agencies)
      .values({ name: `Reporting Agency ${suffix}` })
      .returning({ id: agencies.id });
    const systems = await db
      .select({ id: reportingSystems.id, code: reportingSystems.code })
      .from(reportingSystems)
      .where(eq(reportingSystems.isActive, true));
    const fire = systems.find((system) => system.code === "fire");
    const kbems = systems.find((system) => system.code === "kbems");
    if (!course || !site || !agency || !fire || !kbems)
      throw new Error("Reporting fixture reference creation failed.");
    const [classRecord] = await db
      .insert(trainingClasses)
      .values({
        courseId: course.id,
        trainingSiteId: site.id,
        hostAgencyId: agency.id,
        createdByUserId: instructor.id,
        deliveryMethod: "classroom",
        status: "finalized",
        signInTokenHash: crypto.randomUUID(),
      })
      .returning({ id: trainingClasses.id });
    if (!classRecord)
      throw new Error("Reporting fixture class creation failed.");
    await db.insert(classComponents).values({
      classId: classRecord.id,
      startsAt: new Date("2026-09-14T13:00:00Z"),
      endsAt: new Date("2026-09-14T17:00:00Z"),
      creditedHours: "4",
    });
    await db.insert(classInstructors).values({
      classId: classRecord.id,
      userId: instructor.id,
      isLead: true,
    });
    const [revision] = await db
      .insert(finalizationRevisions)
      .values({
        classId: classRecord.id,
        revisionNumber: 1,
        finalizedByUserId: instructor.id,
        encryptedSnapshot: "fixture",
        summary: {},
      })
      .returning({ id: finalizationRevisions.id });
    if (!revision)
      throw new Error("Reporting fixture revision creation failed.");
    await db.insert(finalizationReportingStatuses).values([
      {
        revisionId: revision.id,
        reportingSystemId: fire.id,
        status: "pending",
      },
      {
        revisionId: revision.id,
        reportingSystemId: kbems.id,
        status: "needs_correction",
        notes: "Missing external entry",
      },
    ]);

    await expect(listReportingQueue(db, instructor)).rejects.toThrow(
      /Training Major or Administrator/i,
    );
    const pending = await listReportingQueue(db, reporter);
    expect(pending.rows).toHaveLength(2);
    expect(pending.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          systemId: fire.id,
          courseName: `Reporting Course ${suffix}`,
          leadInstructor: ROLE_CODES.INSTRUCTOR,
          attendanceCount: 0,
        }),
      ]),
    );

    await updateReportingDestination(db, reporter, {
      revisionId: revision.id,
      reportingSystemId: fire.id,
      status: "entered",
      referenceNumber: " FIRE-42 ",
    });
    const [fireStatus] = await db
      .select()
      .from(finalizationReportingStatuses)
      .where(
        and(
          eq(finalizationReportingStatuses.revisionId, revision.id),
          eq(finalizationReportingStatuses.reportingSystemId, fire.id),
        ),
      );
    const [kbemsStatus] = await db
      .select()
      .from(finalizationReportingStatuses)
      .where(
        and(
          eq(finalizationReportingStatuses.revisionId, revision.id),
          eq(finalizationReportingStatuses.reportingSystemId, kbems.id),
        ),
      );
    expect(fireStatus).toMatchObject({
      status: "entered",
      referenceNumber: "FIRE-42",
      reportedByUserId: reporter.id,
    });
    expect(fireStatus?.reportedAt).toBeInstanceOf(Date);
    expect(kbemsStatus).toMatchObject({
      status: "needs_correction",
      notes: "Missing external entry",
    });
    await updateReportingDestination(db, reporter, {
      revisionId: revision.id,
      reportingSystemId: kbems.id,
      status: "not_required",
    });
    const filtered = await listReportingQueue(db, reporter, {
      reportingSystemId: kbems.id,
      status: "not_required",
      from: new Date("2026-09-14T00:00:00Z"),
      to: new Date("2026-09-14T23:59:59Z"),
    });
    expect(filtered.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          revisionId: revision.id,
          systemId: kbems.id,
          status: "not_required",
        }),
      ]),
    );
    const audit = await db
      .select({ action: auditLogs.action, details: auditLogs.details })
      .from(auditLogs)
      .where(eq(auditLogs.entityId, revision.id));
    expect(audit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "reporting.destination.updated" }),
      ]),
    );
  });

  it("marks a re-finalized class's destination work as revised and names the prior status", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const reporter = await createUser(db, suffix, ROLE_CODES.TRAINING_MAJOR);
    const fixture = await createReportingClassFixture(db, suffix);
    const revisionIds: string[] = [];
    try {
      revisionIds.push(
        await addRevision(db, {
          ...fixture,
          revisionNumber: 1,
          fireStatus: "entered",
        }),
      );
      const secondRevisionId = await addRevision(db, {
        ...fixture,
        revisionNumber: 2,
        fireStatus: "pending",
      });
      revisionIds.push(secondRevisionId);

      const queue = await listReportingQueue(db, reporter);
      const revised = queue.rows.find(
        (row) =>
          row.revisionId === secondRevisionId &&
          row.systemId === fixture.fireId,
      );
      // The prior status ("entered") is outside the default filter, yet it is
      // still carried on the revised item.
      expect(revised).toMatchObject({
        supersededRevisionNumber: 1,
        supersededStatus: "entered",
      });
    } finally {
      await retireRevisions(db, revisionIds);
    }
  });

  it("does not mark a first-time finalization as revised", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const reporter = await createUser(db, suffix, ROLE_CODES.TRAINING_MAJOR);
    const fixture = await createReportingClassFixture(db, suffix);
    const revisionIds: string[] = [];
    try {
      const revisionId = await addRevision(db, {
        ...fixture,
        revisionNumber: 1,
        fireStatus: "pending",
      });
      revisionIds.push(revisionId);

      const queue = await listReportingQueue(db, reporter);
      const firstTime = queue.rows.find(
        (row) =>
          row.revisionId === revisionId && row.systemId === fixture.fireId,
      );
      expect(firstTime).toBeDefined();
      expect(firstTime?.supersededRevisionNumber).toBeNull();
      expect(firstTime?.supersededStatus).toBeNull();
    } finally {
      await retireRevisions(db, revisionIds);
    }
  });
});
