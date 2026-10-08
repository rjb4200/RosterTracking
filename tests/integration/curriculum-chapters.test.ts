import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { PDFDocument } from "pdf-lib";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { finalizeClass } from "../../src/modules/classes/finalization";
import {
  createOpenClass,
  getClassDetail,
} from "../../src/modules/classes/services";
import { renderOfficialRoster } from "../../src/modules/official-roster-pdfs/service";
import { decryptCredential } from "../../src/modules/reference/crypto";
import {
  importCurriculumChapters,
  listCurriculumChapters,
} from "../../src/modules/reference/services";
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
  const [user] = await db
    .insert(users)
    .values({
      username: `chapters-${suffix}`,
      displayName: "Chapter Instructor",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, ROLE_CODES.INSTRUCTOR));
  if (!user || !role) throw new Error("Chapter fixture user failed.");
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

async function createFireFixture(db: Db, suffix: string) {
  const instructor = await createInstructor(db, suffix);
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Chapter Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Chapter Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [trainingCode] = await db
    .insert(trainingCodes)
    .values({
      code: `K1-${suffix.slice(0, 6)}`,
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
      sourceRevision: "test",
    })
    .returning({ id: curricula.id });
  if (!site || !agency || !trainingCode || !curriculum) {
    throw new Error("Chapter fixture references failed.");
  }
  const { systemId, setId } = await activeSetId(db, "fire");
  return {
    instructor,
    site,
    agency,
    trainingCode,
    curriculum,
    systemId,
    setId,
  };
}

async function retireRevision(db: Db, revisionId: string) {
  await db
    .update(finalizationReportingStatuses)
    .set({ status: "not_required", updatedAt: new Date() })
    .where(eq(finalizationReportingStatuses.revisionId, revisionId));
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
  if (!student) throw new Error("Chapter fixture student failed.");
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
  if (!record) throw new Error("Chapter fixture attendance failed.");
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

describeDatabase("curriculum chapters", () => {
  it("imports and lists chapters idempotently, keeping sections distinct", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const [actorRow] = await db
      .insert(users)
      .values({
        username: `chapter-importer-${suffix}`,
        displayName: "Importer",
        passwordHash: "fixture-password-hash",
      })
      .returning({ id: users.id, username: users.username });
    const [curriculum] = await db
      .insert(curricula)
      .values({
        publisher: "IFSTA",
        programTitle: `Essentials ${suffix}`,
        version: "8th Edition",
        sourceRevision: `test-${suffix}`,
      })
      .returning({ id: curricula.id });
    if (!actorRow || !curriculum) throw new Error("Chapter fixture failed.");
    const actor = { id: actorRow.id, username: actorRow.username };
    const rows = [
      {
        curriculumId: curriculum.id,
        part: "Firefighter I",
        number: "1",
        title: "Introduction to the Fire Service and Firefighter Safety",
        position: 0,
        sourceRevision: `test-${suffix}`,
      },
      {
        // Same number as the first, different section: must remain distinct.
        curriculumId: curriculum.id,
        part: "Firefighter II",
        number: "1",
        title: "Incident Scene Operations",
        position: 1,
        sourceRevision: `test-${suffix}`,
      },
      {
        curriculumId: curriculum.id,
        part: "",
        number: "3",
        title: "Communications",
        position: 2,
        sourceRevision: `test-${suffix}`,
      },
    ];

    expect(await importCurriculumChapters(db, actor, rows)).toBe(3);
    // Re-importing updates in place instead of duplicating.
    expect(await importCurriculumChapters(db, actor, rows)).toBe(3);
    const stored = await listCurriculumChapters(db, [curriculum.id]);
    expect(stored).toHaveLength(3);
    expect(stored.map((chapter) => chapter.part)).toEqual([
      "Firefighter I",
      "Firefighter II",
      "",
    ]);
  });

  it("requires a chapter for catalog books and persists chapters and typed books", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const fixture = await createFireFixture(db, suffix);
    const [actorRow] = await db
      .insert(users)
      .values({
        username: `chapter-import-${suffix.slice(0, 8)}`,
        displayName: "Importer",
        passwordHash: "fixture-password-hash",
      })
      .returning({ id: users.id, username: users.username });
    if (!actorRow) throw new Error("Chapter importer was not created.");
    await importCurriculumChapters(
      db,
      { id: actorRow.id, username: actorRow.username },
      [
        {
          curriculumId: fixture.curriculum.id,
          part: "Firefighter I",
          number: "3",
          title: "Communications",
          position: 0,
          sourceRevision: "test",
        },
      ],
    );

    const baseInput = {
      name: `Chapter Course ${suffix}`,
      trainingSiteId: fixture.site.id,
      hostAgencyId: fixture.agency.id,
      deliveryMethod: "classroom" as const,
      startsAt: "2026-09-10T09:00",
      creditedHours: 4,
      leadInstructorId: fixture.instructor.id,
      reportingSystemIds: [fixture.systemId],
      accessPinEnabled: false,
    };

    // A chapter is required when the chosen curriculum has catalog chapters.
    await expect(
      createOpenClass(db, fixture.instructor, {
        ...baseInput,
        subjects: [
          {
            trainingCodeId: fixture.trainingCode.id,
            className: "Hose Loads",
            curriculumId: fixture.curriculum.id,
            lessonPlan: "",
          },
        ],
      }),
    ).rejects.toThrow(/chapter/i);

    // A supplied chapter is stored and preserved through finalization.
    const created = await createOpenClass(db, fixture.instructor, {
      ...baseInput,
      subjects: [
        {
          trainingCodeId: fixture.trainingCode.id,
          className: "Hose Loads",
          curriculumId: fixture.curriculum.id,
          curriculumChapter: "Firefighter I: Chapter 3. Communications",
          lessonPlan: "Chapter 3",
        },
      ],
    });
    const classId = created.classRecord.id;
    const detail = await getClassDetail(db, fixture.instructor, classId);
    expect(detail.components[0]).toMatchObject({
      curriculumChapter: "Firefighter I: Chapter 3. Communications",
    });

    await addActiveAttendance(db, {
      classId,
      agencyId: fixture.agency.id,
      requirementSetId: fixture.setId,
    });
    await db
      .update(trainingClasses)
      .set({ status: "open" })
      .where(eq(trainingClasses.id, classId));
    const revision = await finalizeClass(db, fixture.instructor, classId, {
      certified: true,
      typedName: "Test Instructor",
    });
    const [row] = await db
      .select({ encryptedSnapshot: finalizationRevisions.encryptedSnapshot })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    if (!row) throw new Error("Finalization revision was not stored.");
    const snapshot = JSON.parse(decryptCredential(row.encryptedSnapshot));
    expect(snapshot.components[0]).toMatchObject({
      curriculumChapter: "Firefighter I: Chapter 3. Communications",
    });

    // The KFS-1A renders with the chapter present.
    const kfs = await renderOfficialRoster("kfs-1a", snapshot);
    expect((await PDFDocument.load(kfs)).getPageCount()).toBeGreaterThan(0);
    // Keep the shared reporting queue clean for other integration tests.
    await retireRevision(db, revision.id);
  });

  it("allows a typed book without a chapter", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const fixture = await createFireFixture(db, suffix);
    const created = await createOpenClass(db, fixture.instructor, {
      name: `Typed Book Course ${suffix}`,
      trainingSiteId: fixture.site.id,
      hostAgencyId: fixture.agency.id,
      deliveryMethod: "classroom",
      startsAt: "2026-09-10T09:00",
      creditedHours: 4,
      leadInstructorId: fixture.instructor.id,
      reportingSystemIds: [fixture.systemId],
      accessPinEnabled: false,
      subjects: [
        {
          trainingCodeId: fixture.trainingCode.id,
          className: "Hose Loads",
          curriculumName: "A Book We Do Not Track",
          curriculumChapter: "Chapter 1. Whatever",
          lessonPlan: "",
        },
      ],
    });
    const detail = await getClassDetail(
      db,
      fixture.instructor,
      created.classRecord.id,
    );
    expect(detail.components[0]).toMatchObject({
      curriculumName: "A Book We Do Not Track",
      curriculumChapter: "Chapter 1. Whatever",
    });
  });
});
