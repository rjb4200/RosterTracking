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
} from "../../src/modules/classes/services";
import { decryptCredential } from "../../src/modules/reference/crypto";
import { importCurricula } from "../../src/modules/reference/services";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceReportingContexts,
  curricula,
  finalizationReportingStatuses,
  finalizationRevisions,
  reportingRequirementSets,
  reportingSystems,
  roles,
  students,
  trainingClasses,
  trainingCodes,
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

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function createInstructor(db: Db, suffix: string) {
  const ffnDigits = suffix.replace(/\D/g, "").padEnd(4, "0").slice(0, 4);
  const [user] = await db
    .insert(users)
    .values({
      username: `instructor-${suffix}`,
      displayName: "Fire Instructor",
      passwordHash: "fixture-password-hash",
      ffn: `0001${ffnDigits}`,
      instructorLevel: 2,
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, ROLE_CODES.INSTRUCTOR));
  if (!user || !role) throw new Error("Fire fixture user failed.");
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

async function retireRevision(db: Db, revisionId: string) {
  await db
    .update(finalizationReportingStatuses)
    .set({ status: "not_required", updatedAt: new Date() })
    .where(eq(finalizationReportingStatuses.revisionId, revisionId));
}

async function createFireClassFixture(db: Db, suffix: string) {
  const instructor = await createInstructor(db, suffix);
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Fire Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Fire Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [trainingCode] = await db
    .insert(trainingCodes)
    .values({
      code: `K0000-${suffix.slice(0, 6)}`,
      title: "Hose Loads",
      sourceRevision: "test",
    })
    .returning({ id: trainingCodes.id });
  const [curriculum] = await db
    .insert(curricula)
    .values({
      publisher: "IFSTA",
      programTitle: `Essentials of Firefighting ${suffix}`,
      version: "8th Edition",
      additionalRequirements: "Approval of AHJ",
      sourceRevision: "test",
    })
    .returning({ id: curricula.id });
  if (!site || !agency || !trainingCode || !curriculum) {
    throw new Error("Fire fixture references failed.");
  }
  const { systemId, setId } = await activeSetId(db, "fire");
  const created = await createOpenClass(db, instructor, {
    name: `Fire Course ${suffix}`,
    trainingSiteId: site.id,
    hostAgencyId: agency.id,
    deliveryMethod: "classroom",
    startsAt: "2026-09-10T09:00",
    creditedHours: 4,
    leadInstructorId: instructor.id,
    reportingSystemIds: [systemId],
    accessPinEnabled: false,
    subjects: [
      {
        trainingCodeId: trainingCode.id,
        className: "Hose Loads",
        curriculumId: curriculum.id,
        lessonPlan: "Chapter 10 Hose & App.",
      },
      {
        trainingCodeId: trainingCode.id,
        className: "SCBA Donning",
        curriculumId: "",
        lessonPlan: "",
      },
    ],
  });
  return {
    instructor,
    agency,
    classId: created.classRecord.id,
    setId,
  };
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
  if (!student) throw new Error("Fire fixture student failed.");
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
  if (!record) throw new Error("Fire fixture attendance failed.");
  await db.insert(attendanceReportingContexts).values({
    attendanceId: record.id,
    requirementSetId: input.requirementSetId,
  });
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

describeDatabase("fire roster fields", () => {
  it("imports the approved curricula idempotently", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const rows = [
      {
        publisher: `Publisher ${suffix}`,
        programTitle: "Program One",
        version: "1st Edition",
        additionalRequirements: "Approval of AHJ",
        sourceRevision: `test-${suffix}`,
      },
      {
        publisher: `Publisher ${suffix}`,
        programTitle: "Program Two",
        version: "",
        additionalRequirements: "",
        sourceRevision: `test-${suffix}`,
      },
    ];
    const [actorRow] = await db
      .insert(users)
      .values({
        username: `importer-${suffix}`,
        displayName: "Importer",
        passwordHash: "fixture-password-hash",
      })
      .returning({ id: users.id, username: users.username });
    if (!actorRow) throw new Error("Import actor was not created.");
    const actor = { id: actorRow.id, username: actorRow.username };

    expect(await importCurricula(db, actor, rows)).toBe(2);
    // Re-importing the same rows updates in place instead of duplicating.
    expect(await importCurricula(db, actor, rows)).toBe(2);
    const stored = await db
      .select({ id: curricula.id })
      .from(curricula)
      .where(eq(curricula.sourceRevision, `test-${suffix}`));
    expect(stored).toHaveLength(2);
  });

  it("stores two Fire subjects as sequential sessions", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { instructor, classId } = await createFireClassFixture(
      db,
      crypto.randomUUID(),
    );

    const detail = await getClassDetail(db, instructor, classId);
    expect(detail.components).toHaveLength(2);
    const [first, second] = detail.components;
    expect(first).toMatchObject({
      className: "Hose Loads",
      lessonPlan: "Chapter 10 Hose & App.",
      method: "cr",
    });
    expect(second).toMatchObject({ className: "SCBA Donning", method: "cr" });
    // The second subject starts when the first ends.
    expect(second?.startsAt).toEqual(first?.endsAt);
  });

  it("re-derives the KFS-1A method when the delivery method changes", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { instructor, classId } = await createFireClassFixture(
      db,
      crypto.randomUUID(),
    );
    const { systemId } = await activeSetId(db, "fire");

    const before = await getClassDetail(db, instructor, classId);
    expect(before.components.map((component) => component.method)).toEqual([
      "cr",
      "cr",
    ]);

    await updateClass(db, instructor, classId, {
      name: before.name ?? "",
      trainingSiteId: before.trainingSiteId,
      hostAgencyId: before.hostAgencyId,
      deliveryMethod: "hybrid",
      reportingSystemIds: [systemId],
      accessPinEnabled: false,
    });

    const after = await getClassDetail(db, instructor, classId);
    // Hybrid delivery marks both CR and OL.
    expect(after.components.map((component) => component.method)).toEqual([
      "cr,ol",
      "cr,ol",
    ]);
  });

  it("preserves Fire subjects and instructor certification in the snapshot", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { instructor, agency, classId, setId } = await createFireClassFixture(
      db,
      crypto.randomUUID(),
    );
    await addActiveAttendance(db, {
      classId,
      agencyId: agency.id,
      requirementSetId: setId,
    });
    await db
      .update(trainingClasses)
      .set({ status: "completed" })
      .where(eq(trainingClasses.id, classId));

    const revision = await finalizeClass(db, instructor, classId, {
      certified: true,
      typedName: "Fire Instructor",
    });
    const [row] = await db
      .select({ encryptedSnapshot: finalizationRevisions.encryptedSnapshot })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    if (!row) throw new Error("Finalization revision was not stored.");
    const snapshot = JSON.parse(decryptCredential(row.encryptedSnapshot));

    expect(snapshot.components[0]).toMatchObject({
      className: "Hose Loads",
      category: expect.stringMatching(/^K0000-/),
      curriculumPublisher: "IFSTA",
      curriculumVersion: "8th Edition",
      lessonPlan: "Chapter 10 Hose & App.",
      method: "cr",
    });
    expect(snapshot.components[1]).toMatchObject({ className: "SCBA Donning" });
    expect(snapshot.instructors[0]).toMatchObject({
      name: "Fire Instructor",
      level: 2,
    });
    expect(snapshot.instructors[0].ffn).toMatch(/^0001/);
    await retireRevision(db, revision.id);
  });
});
