import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  finalizeClass,
  ROSTER_ATTESTATION_VERSION,
  reopenFinalizedClass,
} from "../../src/modules/classes/finalization";
import { createOpenClass } from "../../src/modules/classes/services";
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

async function createUser(
  db: Db,
  suffix: string,
  roleCode: string,
  displayName: string,
) {
  const [user] = await db
    .insert(users)
    .values({
      username: `${roleCode}-${suffix}`,
      displayName,
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode));
  if (!user || !role) throw new Error("Signing fixture user failed.");
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  return user;
}

async function retireRevision(db: Db, revisionId: string) {
  await db
    .update(finalizationReportingStatuses)
    .set({ status: "not_required", updatedAt: new Date() })
    .where(eq(finalizationReportingStatuses.revisionId, revisionId));
}

async function activeFireSetId(db: Db) {
  const [system] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(eq(reportingSystems.code, "fire"));
  if (!system) throw new Error("Fire reporting system is missing.");
  const [set] = await db
    .select({ id: reportingRequirementSets.id })
    .from(reportingRequirementSets)
    .where(
      and(
        eq(reportingRequirementSets.reportingSystemId, system.id),
        eq(reportingRequirementSets.isActive, true),
      ),
    );
  if (!set) throw new Error("Fire reporting system has no active set.");
  return { systemId: system.id, setId: set.id };
}

async function createCompletedClass(db: Db, suffix: string) {
  const lead = await createUser(db, suffix, ROLE_CODES.INSTRUCTOR, "Ada Lead");
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Signing Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Signing Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [code] = await db
    .insert(trainingCodes)
    .values({
      code: `S0000-${suffix.slice(0, 6)}`,
      title: "Hose Loads",
      sourceRevision: "test",
    })
    .returning({ id: trainingCodes.id });
  if (!site || !agency || !code) {
    throw new Error("Signing fixture references failed.");
  }
  const { systemId, setId } = await activeFireSetId(db);
  const created = await createOpenClass(db, lead, {
    name: `Signing Course ${suffix}`,
    trainingSiteId: site.id,
    hostAgencyId: agency.id,
    deliveryMethod: "classroom",
    startsAt: "2026-09-10T09:00",
    creditedHours: 4,
    leadInstructorId: lead.id,
    reportingSystemIds: [systemId],
    accessPinEnabled: false,
    subjects: [
      {
        trainingCodeId: code.id,
        className: "Hose Loads",
        curriculumId: "",
        lessonPlan: "",
      },
    ],
  });
  const classId = created.classRecord.id;
  const digits = crypto
    .randomUUID()
    .replace(/\D/g, "")
    .padEnd(10, "0")
    .slice(0, 10);
  const [student] = await db
    .insert(students)
    .values({ firstName: "Zoe", lastName: "Zeta", phone: `+1${digits}` })
    .returning({ id: students.id });
  if (!student) throw new Error("Signing fixture student failed.");
  const [record] = await db
    .insert(attendance)
    .values({
      classId,
      studentId: student.id,
      agencyId: agency.id,
      idempotencyKey: crypto.randomUUID(),
      payloadFingerprint: "fixture",
      creditedHours: "4",
    })
    .returning({ id: attendance.id });
  if (!record) throw new Error("Signing fixture attendance failed.");
  await db.insert(attendanceReportingContexts).values({
    attendanceId: record.id,
    requirementSetId: setId,
  });
  await db
    .update(trainingClasses)
    .set({ status: "completed" })
    .where(eq(trainingClasses.id, classId));
  return { lead, classId };
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

describeDatabase("digital roster signing", () => {
  it("allows only the lead instructor to finalize and records the signature", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const admin = await createUser(
      db,
      suffix,
      ROLE_CODES.ADMINISTRATOR,
      "Admin Signer",
    );
    const { lead, classId } = await createCompletedClass(db, suffix);

    await expect(
      finalizeClass(db, admin, classId, {
        certified: true,
        typedName: "Admin Signer",
      }),
    ).rejects.toThrow(/lead instructor/i);

    const revision = await finalizeClass(db, lead, classId, {
      certified: true,
      typedName: "Ada Lead",
    });
    const [row] = await db
      .select({
        signedByName: finalizationRevisions.signedByName,
        signedByUserId: finalizationRevisions.signedByUserId,
        signedAt: finalizationRevisions.signedAt,
        attestationVersion: finalizationRevisions.attestationVersion,
      })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    expect(row?.signedByName).toBe("Ada Lead");
    expect(row?.signedByUserId).toBe(lead.id);
    expect(row?.signedAt).toBeInstanceOf(Date);
    expect(row?.attestationVersion).toBe(ROSTER_ATTESTATION_VERSION);
    await retireRevision(db, revision.id);
  });

  it("requires the certification and a typed name to finalize", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { lead, classId } = await createCompletedClass(
      db,
      crypto.randomUUID().slice(0, 8),
    );

    await expect(
      finalizeClass(db, lead, classId, { certified: false, typedName: "Ada" }),
    ).rejects.toThrow(/certify/i);
    await expect(
      finalizeClass(db, lead, classId, { certified: true, typedName: "   " }),
    ).rejects.toThrow(/type your name/i);
  });

  it("lets only an Administrator reopen with a note", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const admin = await createUser(
      db,
      suffix,
      ROLE_CODES.ADMINISTRATOR,
      "Admin Reopener",
    );
    const { lead, classId } = await createCompletedClass(db, suffix);
    const revision = await finalizeClass(db, lead, classId, {
      certified: true,
      typedName: "Ada Lead",
    });

    await expect(
      reopenFinalizedClass(db, lead, classId, "Correcting a credit"),
    ).rejects.toThrow(/administrator/i);
    await expect(
      reopenFinalizedClass(db, admin, classId, "   "),
    ).rejects.toThrow(/reason/i);

    await reopenFinalizedClass(db, admin, classId, "Correcting a credit");
    const [row] = await db
      .select({ status: trainingClasses.status })
      .from(trainingClasses)
      .where(eq(trainingClasses.id, classId));
    expect(row?.status).toBe("open");
    await retireRevision(db, revision.id);
  });
});
