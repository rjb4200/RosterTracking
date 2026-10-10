import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { PDFDocument } from "pdf-lib";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { finalizeClass } from "../../src/modules/classes/finalization";
import { createOpenClass } from "../../src/modules/classes/services";
import {
  generateFireRosterWithNotices,
  sendParticipantNoticeOnDemand,
} from "../../src/modules/individual-training-notices/service";
import { encryptCredential } from "../../src/modules/reference/crypto";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceReportingContexts,
  attendanceRequiredFieldSnapshots,
  auditLogs,
  curricula,
  emailDeliveries,
  finalizationReportingStatuses,
  reportingRequirementSets,
  reportingSystems,
  students,
  trainingClasses,
  trainingCodes,
  trainingSites,
} from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";
import { createStaffUser, uniqueFfn } from "./support/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

const NOTICE_TEMPLATE = "individual-training-notice";

async function createInstructor(db: Db, suffix: string) {
  return createStaffUser(db, {
    username: `notice-instructor-${suffix}`,
    displayName: "Notice Instructor",
  });
}

async function fireSetId(db: Db) {
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
  if (!set) throw new Error("Fire requirement set is missing.");
  return { systemId: system.id, setId: set.id };
}

async function createFireClass(db: Db, suffix: string) {
  const instructor = await createInstructor(db, suffix);
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Notice Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [hostAgency] = await db
    .insert(agencies)
    .values({ name: `Host Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [trainingCode] = await db
    .insert(trainingCodes)
    .values({
      code: `N0000-${suffix.slice(0, 6)}`,
      title: "Hose Loads",
      sourceRevision: "test",
    })
    .returning({ id: trainingCodes.id });
  const [curriculum] = await db
    .insert(curricula)
    .values({
      publisher: "IFSTA",
      programTitle: `Essentials ${suffix}`,
      version: "8th Edition",
      additionalRequirements: "Approval of AHJ",
      sourceRevision: "test",
    })
    .returning({ id: curricula.id });
  if (!site || !hostAgency || !trainingCode || !curriculum) {
    throw new Error("Notice fixture references failed.");
  }
  const { systemId, setId } = await fireSetId(db);
  const created = await createOpenClass(db, instructor, {
    name: `Notice Course ${suffix}`,
    trainingSiteId: site.id,
    hostAgencyId: hostAgency.id,
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
        lessonPlan: "Chapter 10",
      },
    ],
  });
  return { instructor, hostAgency, classId: created.classRecord.id, setId };
}

async function addAttendance(
  db: Db,
  input: {
    classId: string;
    agencyId: string;
    requirementSetId: string;
    email: string;
    ffn?: string;
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
      firstName: "Roster",
      lastName: "Member",
      phone: `+1${digits}`,
      email: input.email,
    })
    .returning({ id: students.id });
  if (!student) throw new Error("Notice fixture student failed.");
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
  if (!record) throw new Error("Notice fixture attendance failed.");
  await db.insert(attendanceReportingContexts).values({
    attendanceId: record.id,
    requirementSetId: input.requirementSetId,
  });
  // Fire roster membership is gated by a valid FFN, recorded here as the
  // required-field snapshot the sign-in flow would have written.
  if (input.ffn) {
    await db.insert(attendanceRequiredFieldSnapshots).values({
      attendanceId: record.id,
      requirementSetId: input.requirementSetId,
      studentField: "ffn",
      encryptedValue: encryptCredential(input.ffn),
    });
  }
  return record.id;
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

describeDatabase("individual training notices", () => {
  it("queues a notice only for participants outside the host agency", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { instructor, hostAgency, classId, setId } = await createFireClass(
      db,
      suffix,
    );
    const [outsideAgency] = await db
      .insert(agencies)
      .values({ name: `Outside Agency ${suffix}` })
      .returning({ id: agencies.id });
    if (!outsideAgency) throw new Error("Outside agency failed.");
    await addAttendance(db, {
      classId,
      agencyId: hostAgency.id,
      requirementSetId: setId,
      email: `host-${suffix.slice(0, 6)}@example.com`,
      ffn: uniqueFfn(),
    });
    await addAttendance(db, {
      classId,
      agencyId: outsideAgency.id,
      requirementSetId: setId,
      email: `outside-${suffix.slice(0, 6)}@example.com`,
      ffn: uniqueFfn(),
    });
    await db
      .update(trainingClasses)
      .set({ status: "open" })
      .where(eq(trainingClasses.id, classId));

    const revision = await finalizeClass(db, instructor, classId, {
      certified: true,
      typedName: "Notice Instructor",
    });
    const rows = await db
      .select()
      .from(emailDeliveries)
      .where(
        and(
          eq(emailDeliveries.referenceId, revision.id),
          eq(emailDeliveries.template, NOTICE_TEMPLATE),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("queued");
    expect(rows[0]?.recipient).toContain("outside-");

    // The Fire roster appends one Yellow notice page for the outside participant.
    const roster = await generateFireRosterWithNotices(
      db,
      instructor,
      revision.id,
    );
    expect((await PDFDocument.load(roster.bytes)).getPageCount()).toBe(2);
    await retireRevision(db, revision.id);
  });

  it("produces no notices when every participant represents the host agency", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { instructor, hostAgency, classId, setId } = await createFireClass(
      db,
      suffix,
    );
    await addAttendance(db, {
      classId,
      agencyId: hostAgency.id,
      requirementSetId: setId,
      email: `host2-${suffix.slice(0, 6)}@example.com`,
      ffn: uniqueFfn(),
    });
    await db
      .update(trainingClasses)
      .set({ status: "open" })
      .where(eq(trainingClasses.id, classId));

    const revision = await finalizeClass(db, instructor, classId, {
      certified: true,
      typedName: "Notice Instructor",
    });
    const rows = await db
      .select()
      .from(emailDeliveries)
      .where(
        and(
          eq(emailDeliveries.referenceId, revision.id),
          eq(emailDeliveries.template, NOTICE_TEMPLATE),
        ),
      );
    expect(rows).toHaveLength(0);
    const roster = await generateFireRosterWithNotices(
      db,
      instructor,
      revision.id,
    );
    expect((await PDFDocument.load(roster.bytes)).getPageCount()).toBe(1);
    await retireRevision(db, revision.id);
  });

  it("emails an on-demand notice for a host-agency participant", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const { instructor, hostAgency, classId, setId } = await createFireClass(
      db,
      suffix,
    );
    const attendanceId = await addAttendance(db, {
      classId,
      agencyId: hostAgency.id,
      requirementSetId: setId,
      email: `host3-${suffix.slice(0, 6)}@example.com`,
    });
    await db
      .update(trainingClasses)
      .set({ status: "open" })
      .where(eq(trainingClasses.id, classId));
    const revision = await finalizeClass(db, instructor, classId, {
      certified: true,
      typedName: "Notice Instructor",
    });

    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "m1" }) }),
    );
    try {
      const result = await sendParticipantNoticeOnDemand(
        db,
        instructor,
        revision.id,
        attendanceId,
        "yellow",
        "custom@example.com",
      );
      expect(result).toEqual({
        recipient: "custom@example.com",
        state: "delivered",
      });
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }

    const rows = await db
      .select()
      .from(emailDeliveries)
      .where(
        and(
          eq(emailDeliveries.referenceId, revision.id),
          eq(emailDeliveries.template, NOTICE_TEMPLATE),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("sent");
    expect(rows[0]?.recipient).toBe("custom@example.com");

    const events = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityId, revision.id),
          eq(auditLogs.action, "individual_training_notice.emailed"),
        ),
      );
    expect(events).toHaveLength(1);
    await retireRevision(db, revision.id);
  });
});
