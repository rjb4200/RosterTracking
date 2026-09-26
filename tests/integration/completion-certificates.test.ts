import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { finalizeClass } from "../../src/modules/classes/finalization";
import { createOpenClass } from "../../src/modules/classes/services";
import { generateCompletionCertificates } from "../../src/modules/completion-certificates/service";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceReportingContexts,
  auditLogs,
  finalizationReportingStatuses,
  reportingRequirementSets,
  reportingSystems,
  roles,
  students,
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

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function createInstructor(db: Db, suffix: string) {
  const [user] = await db
    .insert(users)
    .values({
      username: `cert-instructor-${suffix}`,
      displayName: "Cert Instructor",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, ROLE_CODES.INSTRUCTOR));
  if (!user || !role) throw new Error("Certificate fixture user failed.");
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

async function createFinalizedKbemsClass(db: Db, suffix: string) {
  const instructor = await createInstructor(db, suffix);
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `EMS Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `EMS Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!site || !agency) {
    throw new Error("Certificate fixture references failed.");
  }
  const { systemId, setId } = await activeSetId(db, "kbems");
  const created = await createOpenClass(db, instructor, {
    name: `EMS Course ${suffix}`,
    trainingSiteId: site.id,
    hostAgencyId: agency.id,
    deliveryMethod: "classroom",
    startsAt: "2026-09-10T09:00",
    creditedHours: 2,
    leadInstructorId: instructor.id,
    reportingSystemIds: [systemId],
    accessPinEnabled: false,
    courseType: "continuing_education",
    courseNumber: `CE-${suffix.slice(0, 6)}`,
  });
  const classId = created.classRecord.id;

  const digits = crypto
    .randomUUID()
    .replace(/\D/g, "")
    .padEnd(10, "0")
    .slice(0, 10);
  const [student] = await db
    .insert(students)
    .values({ firstName: "Ada", lastName: "Lovelace", phone: `+1${digits}` })
    .returning({ id: students.id });
  if (!student) throw new Error("Certificate fixture student failed.");
  const [record] = await db
    .insert(attendance)
    .values({
      classId,
      studentId: student.id,
      agencyId: agency.id,
      idempotencyKey: crypto.randomUUID(),
      payloadFingerprint: "fixture",
      creditedHours: "2",
    })
    .returning({ id: attendance.id });
  if (!record) throw new Error("Certificate fixture attendance failed.");
  await db.insert(attendanceReportingContexts).values({
    attendanceId: record.id,
    requirementSetId: setId,
  });
  await db
    .update(trainingClasses)
    .set({ status: "completed" })
    .where(eq(trainingClasses.id, classId));

  const revision = await finalizeClass(db, instructor, classId);
  return { instructor, classId, revisionId: revision.id };
}

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

describeDatabase("completion certificates", () => {
  it("generates certificates for a finalized revision and audits the blank signature", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { instructor, revisionId } = await createFinalizedKbemsClass(
      db,
      crypto.randomUUID(),
    );

    const certificates = await generateCompletionCertificates(
      db,
      instructor,
      revisionId,
    );
    expect(certificates.participantCount).toBe(1);
    expect(certificates.bytes.byteLength).toBeGreaterThan(0);
    expect(certificates.filename).toMatch(/completion-certificate/);

    const events = await db
      .select({ action: auditLogs.action, details: auditLogs.details })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityId, revisionId),
          eq(auditLogs.action, "completion_certificate.generated"),
        ),
      );
    expect(events).toHaveLength(1);
    expect(events[0]?.details).toMatchObject({
      participantCount: 1,
      signatureBlank: true,
    });
    await retireRevision(db, revisionId);
  });

  it("denies an instructor who is not assigned to the class", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { revisionId } = await createFinalizedKbemsClass(db, suffix);
    const stranger = await createInstructor(db, crypto.randomUUID());

    await expect(
      generateCompletionCertificates(db, stranger, revisionId),
    ).rejects.toThrow(/access denied/i);
    await retireRevision(db, revisionId);
  });

  it("rejects a revision that does not exist", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createInstructor(db, crypto.randomUUID());

    await expect(
      generateCompletionCertificates(db, instructor, crypto.randomUUID()),
    ).rejects.toThrow(/not found/i);
  });
});
