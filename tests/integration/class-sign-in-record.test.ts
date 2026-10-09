import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildClassSignInRecord,
  getClassSignInRecord,
} from "../../src/modules/class-sign-in-record/service";
import { hashClassSignInToken } from "../../src/modules/classes/token";
import { confirmAttendance } from "../../src/modules/student-sign-in/attendance";
import { stageGuestParticipant } from "../../src/modules/student-sign-in/participants";
import { createWorkflowFromClassToken } from "../../src/modules/student-sign-in/workflow";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  classComponents,
  classInstructors,
  students,
  trainingClasses,
  trainingSites,
  users,
} from "../../src/server/db/schema";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

beforeAll(async () => {
  vi.stubEnv("AUTH_SECRET", "integration-auth-secret-at-least-32-characters");
  vi.stubEnv(
    "CREDENTIAL_ENCRYPTION_KEY",
    "WfAtPIckXdR1AkTmkBZOPGTns2gUyVLExMfK/1islVM=",
  );
  if (pool) {
    await migrate(drizzle(pool, { schema }), { migrationsFolder: "drizzle" });
  }
});

afterAll(async () => {
  await pool?.end();
});

const request = {
  ipAddress: "203.0.113.10",
  requestSourceFingerprint: "test-source-fingerprint",
  requestCorrelationId: "test-correlation-id",
};

async function createFixture() {
  if (!pool) throw new Error("TEST_DATABASE_URL is required.");
  const db = drizzle(pool, { schema });
  await db.transaction(seedReferenceData);
  const suffix = crypto.randomUUID();
  const rawToken = crypto.randomUUID();
  const [actor] = await db
    .insert(users)
    .values({
      username: `record-${suffix}`,
      displayName: "Record Instructor",
      passwordHash: "not-a-real-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Record Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Record Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!actor || !site || !agency) {
    throw new Error("Record fixtures were not created.");
  }
  const [classRecord] = await db
    .insert(trainingClasses)
    .values({
      name: `Record Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      createdByUserId: actor.id,
      deliveryMethod: "classroom",
      status: "open",
      signInTokenHash: hashClassSignInToken(rawToken),
      openedAt: new Date(),
    })
    .returning({ id: trainingClasses.id });
  if (!classRecord) throw new Error("Record class was not created.");
  await db.insert(classInstructors).values({
    classId: classRecord.id,
    userId: actor.id,
    isLead: true,
  });
  await db.insert(classComponents).values({
    classId: classRecord.id,
    startsAt: new Date("2026-09-10T13:00:00Z"),
    endsAt: new Date("2026-09-10T17:00:00Z"),
    creditedHours: "4",
  });
  return { db, actor, agency, classRecord, rawToken };
}

describeDatabase("class sign-in record", () => {
  it("derives attestation facts for regular and guest attendance", async () => {
    const fixture = await createFixture();
    const [student] = await fixture.db
      .insert(students)
      .values({
        firstName: "Record",
        lastName: "Student",
        phone: `+1859${Math.floor(Math.random() * 10_000_000)
          .toString()
          .padStart(7, "0")}`,
        email: `record-${crypto.randomUUID().slice(0, 8)}@example.com`,
      })
      .returning({ id: students.id });
    if (!student) throw new Error("Student fixture was not created.");

    const regularWorkflow = await createWorkflowFromClassToken(
      fixture.db,
      fixture.rawToken,
      {
        participant: {
          kind: "regular",
          studentId: student.id,
          signInMethod: "current_phone",
          profileConfirmed: true,
          fields: {},
          credentials: [],
        },
        selectedAgencyId: fixture.agency.id,
        pendingNewPhone: null,
        requirementSets: [],
      },
    );
    const guestWorkflow = await createWorkflowFromClassToken(
      fixture.db,
      fixture.rawToken,
    );
    if (!regularWorkflow || !guestWorkflow) {
      throw new Error("Workflows were not created.");
    }
    await confirmAttendance(fixture.db, regularWorkflow.token, {
      attestationConfirmed: true,
      rememberDevice: false,
      request,
    });
    await stageGuestParticipant(fixture.db, guestWorkflow.token, {
      firstName: "Guest",
      lastName: "Record",
      agencyId: fixture.agency.id,
      fields: { email: "guest.record@example.com" },
      credentials: [],
    });
    await confirmAttendance(fixture.db, guestWorkflow.token, {
      attestationConfirmed: true,
      rememberDevice: false,
      request,
    });

    const record = await getClassSignInRecord(
      fixture.db,
      fixture.actor,
      fixture.classRecord.id,
    );
    expect(record.active).toHaveLength(2);
    expect(record.removed).toHaveLength(0);
    expect(record.hostAgencyName).toContain("Record Agency");
    for (const entry of record.active) {
      expect(entry.attestation).not.toBeNull();
      expect(entry.attestation?.renderedText).toContain("I confirm that I am");
      expect(entry.attestation?.textVersion).toBe(1);
      expect(entry.attestation?.originatingIp).toBe("203.0.113.10");
    }
    const regular = record.active.find(
      (entry) => entry.participantType === "regular",
    );
    expect(regular?.participantName).toContain("Record Student");
  });

  it("separates removed attendance into the retained history section", async () => {
    const fixture = await createFixture();
    const workflow = await createWorkflowFromClassToken(
      fixture.db,
      fixture.rawToken,
    );
    if (!workflow) throw new Error("Workflow was not created.");
    await stageGuestParticipant(fixture.db, workflow.token, {
      firstName: "Removed",
      lastName: "Guest",
      agencyId: fixture.agency.id,
      fields: { email: "removed.guest@example.com" },
      credentials: [],
    });
    const created = await confirmAttendance(fixture.db, workflow.token, {
      attestationConfirmed: true,
      rememberDevice: false,
      request,
    });
    await fixture.db
      .update(attendance)
      .set({
        removedAt: new Date(),
        removedByUserId: fixture.actor.id,
        removalReason: "Recorded removal",
      })
      .where(eq(attendance.id, created.attendanceId));

    const record = await getClassSignInRecord(
      fixture.db,
      fixture.actor,
      fixture.classRecord.id,
    );
    expect(record.active).toHaveLength(0);
    expect(record.removed).toHaveLength(1);
    expect(record.removed[0]).toMatchObject({
      removalReason: "Recorded removal",
      participantName: "Removed Guest",
    });
  });

  it("omits absent attestation facts without failing the record", () => {
    const record = buildClassSignInRecord(
      [
        {
          attendanceId: crypto.randomUUID(),
          studentId: null,
          firstName: null,
          lastName: null,
          guestFirstName: "Manual",
          guestLastName: "Entry",
          agencyName: "Agency",
          creditedHours: "4",
          signedInAt: new Date(),
          removedAt: null,
          removalReason: null,
          removedBy: null,
          signInMethod: null,
          renderedText: null,
          textVersion: null,
          confirmedAt: null,
          originatingIp: null,
          rememberedDeviceId: null,
        },
      ],
      {
        classId: crypto.randomUUID(),
        courseName: "Course",
        siteName: null,
        hostAgencyName: "Agency",
        deliveryMethod: "classroom",
        generatedAt: new Date(),
      },
    );
    expect(record.active).toHaveLength(1);
    expect(record.active[0]?.attestation).toBeNull();
  });
});
