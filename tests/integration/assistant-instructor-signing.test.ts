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
  setClassInstructors,
} from "../../src/modules/classes/services";
import { generateFireRosterWithNotices } from "../../src/modules/individual-training-notices/service";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  classInstructors,
  finalizationRevisions,
  reportingRequirementSets,
  reportingSystems,
  revisionAttestations,
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

async function activeSetId(db: Db, code: string) {
  const [system] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(eq(reportingSystems.code, code));
  if (!system) throw new Error(`${code} reporting system is missing.`);
  const [set] = await db
    .select({ id: reportingRequirementSets.id })
    .from(reportingRequirementSets)
    .where(
      and(
        eq(reportingRequirementSets.reportingSystemId, system.id),
        eq(reportingRequirementSets.isActive, true),
      ),
    );
  if (!set) throw new Error(`${code} reporting system has no active set.`);
  return { systemId: system.id, setId: set.id };
}

async function references(db: Db, suffix: string) {
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Multi Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Multi Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [code] = await db
    .insert(trainingCodes)
    .values({
      code: `M0000-${suffix.slice(0, 6)}`,
      title: "Hose Loads",
      sourceRevision: "test",
    })
    .returning({ id: trainingCodes.id });
  if (!site || !agency || !code) throw new Error("Fixture setup failed.");
  const fire = await activeSetId(db, "fire");
  return { siteId: site.id, agencyId: agency.id, codeId: code.id, ...fire };
}

async function addParticipant(
  db: Db,
  classId: string,
  agencyId: string,
  requirementSetId: string,
) {
  const digits = crypto
    .randomUUID()
    .replace(/\D/g, "")
    .padEnd(10, "0")
    .slice(0, 10);
  const [student] = await db
    .insert(students)
    .values({
      firstName: "Multi",
      lastName: "Student",
      studentNumber: digits,
      phone: `555${digits.slice(0, 7)}`,
    })
    .returning({ id: students.id });
  if (!student) throw new Error("Student fixture failed.");
  const [row] = await db
    .insert(attendance)
    .values({
      classId,
      studentId: student.id,
      agencyId,
      creditedHours: "4",
      idempotencyKey: crypto.randomUUID(),
      payloadFingerprint: crypto.randomUUID(),
    })
    .returning({ id: attendance.id });
  if (!row) throw new Error("Attendance fixture failed.");
  await db.insert(schema.attendanceReportingContexts).values({
    attendanceId: row.id,
    requirementSetId,
  });
  return row.id;
}

async function createTeamClass(db: Db, suffix: string) {
  const lead = await createStaffUser(db, {
    username: `fire-lead-${suffix}`,
    displayName: "Fire Lead",
    roleCode: ROLE_CODES.INSTRUCTOR,
  });
  const assistant = await createStaffUser(db, {
    username: `ems-assistant-${suffix}`,
    displayName: "EMS Assistant",
    roleCode: ROLE_CODES.INSTRUCTOR,
    ffn: null,
    instructorLevel: null,
  });
  const additional = await createStaffUser(db, {
    username: `additional-${suffix}`,
    displayName: "Additional Instructor",
    roleCode: ROLE_CODES.INSTRUCTOR,
    ffn: null,
    instructorLevel: null,
  });
  const refs = await references(db, suffix);
  const created = await createOpenClass(db, lead, {
    name: `Team Fire ${suffix}`,
    trainingSiteId: refs.siteId,
    hostAgencyId: refs.agencyId,
    deliveryMethod: "classroom",
    startsAt: "2026-09-10T09:00",
    creditedHours: 4,
    leadInstructorId: lead.id,
    assistantInstructorId: assistant.id,
    additionalInstructorIds: [additional.id],
    reportingSystemIds: [refs.systemId],
    accessPinEnabled: false,
    subjects: [
      {
        trainingCodeId: refs.codeId,
        className: "Hose Loads",
        curriculumId: "",
        lessonPlan: "",
      },
    ],
  });
  const classId = created.classRecord.id;
  const attendanceId = await addParticipant(
    db,
    classId,
    refs.agencyId,
    refs.setId,
  );
  return { lead, assistant, additional, classId, attendanceId, ...refs };
}

beforeAll(async () => {
  if (!pool) return;
  process.env.ADDITIONAL_INSTRUCTOR_EDITING = "1";
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.transaction(seedFoundation);
  await db.transaction(seedReferenceData);
});

afterAll(async () => {
  delete process.env.ADDITIONAL_INSTRUCTOR_EDITING;
  await pool?.end();
});

describeDatabase("multi-instructor class rosters", () => {
  it("records a fire-qualified lead, assistant, and additional instructors", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { lead, assistant, additional, classId } = await createTeamClass(
      db,
      crypto.randomUUID().slice(0, 8),
    );
    const assignments = await db
      .select({
        userId: classInstructors.userId,
        isLead: classInstructors.isLead,
        isAssistant: classInstructors.isAssistant,
      })
      .from(classInstructors)
      .where(eq(classInstructors.classId, classId));
    expect(assignments).toEqual(
      expect.arrayContaining([
        { userId: lead.id, isLead: true, isAssistant: false },
        { userId: assistant.id, isLead: false, isAssistant: true },
        { userId: additional.id, isLead: false, isAssistant: false },
      ]),
    );
    await expect(
      getClassDetail(db, additional, classId),
    ).resolves.toMatchObject({
      id: classId,
    });
  });

  it("rejects a Fire class whose lead is not fire-qualified", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const lead = await createStaffUser(db, {
      username: `nonfire-lead-${suffix}`,
      displayName: "Non Fire Lead",
      roleCode: ROLE_CODES.INSTRUCTOR,
      ffn: null,
      instructorLevel: null,
    });
    const fireAssistant = await createStaffUser(db, {
      username: `fire-assistant-${suffix}`,
      displayName: "Fire Assistant",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });
    const refs = await references(db, suffix);
    await expect(
      createOpenClass(db, lead, {
        name: `Non Fire Lead ${suffix}`,
        trainingSiteId: refs.siteId,
        hostAgencyId: refs.agencyId,
        deliveryMethod: "classroom",
        startsAt: "2026-09-10T09:00",
        creditedHours: 4,
        leadInstructorId: lead.id,
        assistantInstructorId: fireAssistant.id,
        reportingSystemIds: [refs.systemId],
        accessPinEnabled: false,
        subjects: [
          {
            trainingCodeId: refs.codeId,
            className: "Hose Loads",
            curriculumId: "",
            lessonPlan: "",
          },
        ],
      }),
    ).rejects.toThrow(/lead.*fire instructor/i);
  });

  it("preserves additional instructors when a compatibility submission omits them", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { lead, assistant, additional, classId } = await createTeamClass(
      db,
      crypto.randomUUID().slice(0, 8),
    );

    process.env.ADDITIONAL_INSTRUCTOR_EDITING = "0";
    await setClassInstructors(db, lead, classId, {
      leadInstructorId: lead.id,
      assistantInstructorId: assistant.id,
    });
    let rows = await db
      .select({ userId: classInstructors.userId })
      .from(classInstructors)
      .where(eq(classInstructors.classId, classId));
    expect(rows.map((row) => row.userId)).toContain(additional.id);

    process.env.ADDITIONAL_INSTRUCTOR_EDITING = "1";
    await setClassInstructors(db, lead, classId, {
      leadInstructorId: lead.id,
      assistantInstructorId: assistant.id,
      additionalInstructorIds: [],
    });
    rows = await db
      .select({ userId: classInstructors.userId })
      .from(classInstructors)
      .where(eq(classInstructors.classId, classId));
    expect(rows.map((row) => row.userId)).not.toContain(additional.id);
  });

  it("finalizes with the lead as the only Fire signer and appends the instructor supplement", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { lead, classId } = await createTeamClass(
      db,
      crypto.randomUUID().slice(0, 8),
    );

    const revision = await finalizeClass(db, lead, classId, {
      certified: true,
      typedName: "Fire Lead",
    });
    const [revisionRow] = await db
      .select({ fireSignerUserId: finalizationRevisions.fireSignerUserId })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    expect(revisionRow?.fireSignerUserId).toBe(lead.id);

    const attestations = await db
      .select({
        scope: revisionAttestations.scope,
        signedByUserId: revisionAttestations.signedByUserId,
      })
      .from(revisionAttestations)
      .where(eq(revisionAttestations.revisionId, revision.id));
    expect(attestations).toEqual(
      expect.arrayContaining([
        { scope: "roster", signedByUserId: lead.id },
        { scope: "fire", signedByUserId: lead.id },
      ]),
    );

    const roster = await generateFireRosterWithNotices(db, lead, revision.id);
    const pdf = await PDFDocument.load(roster.bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
