import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { hashClassSignInToken } from "../../src/modules/classes/token";
import { confirmAttendance } from "../../src/modules/student-sign-in/attendance";
import { establishSignInContext } from "../../src/modules/student-sign-in/establish-context";
import {
  stageGuestParticipant,
  stageRegularRequirements,
} from "../../src/modules/student-sign-in/participants";
import {
  createWorkflowFromClassToken,
  loadSignInWorkflow,
} from "../../src/modules/student-sign-in/workflow";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  classComponents,
  classGuests,
  classInstructors,
  courses,
  rememberedDevices,
  studentAgencies,
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

async function createOpenClassFixture() {
  if (!pool) throw new Error("TEST_DATABASE_URL is required.");
  const db = drizzle(pool, { schema });
  await db.transaction(seedReferenceData);
  const suffix = crypto.randomUUID();
  const rawToken = crypto.randomUUID();
  const [actor] = await db
    .insert(users)
    .values({
      username: `sign-in-${suffix}`,
      displayName: "Sign-in Test",
      passwordHash: "not-a-real-hash",
    })
    .returning({ id: users.id });
  const [course] = await db
    .insert(courses)
    .values({ name: `Sign-in Course ${suffix}` })
    .returning({ id: courses.id });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Sign-in Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Sign-in Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!actor || !course || !site || !agency) {
    throw new Error("Sign-in fixtures were not created.");
  }
  const [classRecord] = await db
    .insert(trainingClasses)
    .values({
      courseId: course.id,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      createdByUserId: actor.id,
      deliveryMethod: "classroom",
      status: "open",
      signInTokenHash: hashClassSignInToken(rawToken),
      openedAt: new Date(),
    })
    .returning({ id: trainingClasses.id });
  if (!classRecord) throw new Error("Open class fixture was not created.");
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

const request = {
  ipAddress: "203.0.113.10",
  requestSourceFingerprint: "test-source-fingerprint",
  requestCorrelationId: "test-correlation-id",
};

const metadata = request;

const cookiesMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

describeDatabase("student sign-in transaction", () => {
  it("creates an idempotent class guest without a permanent student", async () => {
    const fixture = await createOpenClassFixture();
    const [beforeCount] = await fixture.db
      .select({ value: count() })
      .from(students);
    if (!beforeCount) throw new Error("Student count was not returned.");
    const workflow = await createWorkflowFromClassToken(
      fixture.db,
      fixture.rawToken,
    );
    if (!workflow) throw new Error("Workflow was not created.");
    await stageGuestParticipant(fixture.db, workflow.token, {
      firstName: "Guest",
      lastName: "Participant",
      agencyId: fixture.agency.id,
      fields: {},
      credentials: [],
    });

    const created = await confirmAttendance(fixture.db, workflow.token, {
      attestationConfirmed: true,
      rememberDevice: true,
      request,
    });
    const retried = await confirmAttendance(fixture.db, workflow.token, {
      attestationConfirmed: true,
      rememberDevice: true,
      request,
    });
    const [afterCount] = await fixture.db
      .select({ value: count() })
      .from(students);
    if (!afterCount) throw new Error("Student count was not returned.");

    expect(created.status).toBe("created");
    expect(created.rememberedDevice).toBeUndefined();
    expect(retried).toMatchObject({
      attendanceId: created.attendanceId,
      status: "idempotent",
    });
    expect(afterCount.value).toBe(beforeCount.value);
    expect(
      await fixture.db
        .select()
        .from(classGuests)
        .where(eq(classGuests.classId, fixture.classRecord.id)),
    ).toHaveLength(1);
  });

  it("retains removed regular attendance and permits one new active record", async () => {
    const fixture = await createOpenClassFixture();
    const [student] = await fixture.db
      .insert(students)
      .values({
        firstName: "Regular",
        lastName: "Student",
        phone: `+1859${Math.floor(Math.random() * 10_000_000)
          .toString()
          .padStart(7, "0")}`,
      })
      .returning({ id: students.id });
    if (!student) throw new Error("Student fixture was not created.");
    await fixture.db.insert(studentAgencies).values({
      studentId: student.id,
      agencyId: fixture.agency.id,
      isPrimary: true,
    });

    const signIn = async () => {
      const workflow = await createWorkflowFromClassToken(
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
      if (!workflow) throw new Error("Workflow was not created.");
      return confirmAttendance(fixture.db, workflow.token, {
        attestationConfirmed: true,
        rememberDevice: true,
        request,
      });
    };

    const first = await signIn();
    expect(first.rememberedDevice?.token).toBeTruthy();
    await fixture.db
      .update(attendance)
      .set({
        removedAt: new Date(),
        removedByUserId: fixture.actor.id,
        removalReason: "Integration test removal",
      })
      .where(eq(attendance.id, first.attendanceId));
    const second = await signIn();

    expect(second.attendanceId).not.toBe(first.attendanceId);
    expect(
      await fixture.db
        .select()
        .from(attendance)
        .where(eq(attendance.classId, fixture.classRecord.id)),
    ).toHaveLength(2);
    expect(
      await fixture.db
        .select()
        .from(rememberedDevices)
        .where(eq(rememberedDevices.studentId, student.id)),
    ).toHaveLength(2);
  });

  it("accepts a regular student whose agency is outside their memberships", async () => {
    const fixture = await createOpenClassFixture();
    const [student] = await fixture.db
      .insert(students)
      .values({
        firstName: "Outside",
        lastName: "Agency",
        phone: `+1859${Math.floor(Math.random() * 10_000_000)
          .toString()
          .padStart(7, "0")}`,
      })
      .returning({ id: students.id });
    if (!student) throw new Error("Student fixture was not created.");

    const workflow = await createWorkflowFromClassToken(
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
        selectedAgencyId: null,
        pendingNewPhone: null,
        requirementSets: [],
      },
    );
    if (!workflow) throw new Error("Workflow was not created.");

    await stageRegularRequirements(fixture.db, workflow.token, {
      fields: {},
      credentials: [],
      agencyId: fixture.agency.id,
    });
    expect(
      await fixture.db
        .select()
        .from(studentAgencies)
        .where(eq(studentAgencies.studentId, student.id)),
    ).toHaveLength(0);

    const result = await confirmAttendance(fixture.db, workflow.token, {
      attestationConfirmed: true,
      rememberDevice: false,
      request,
    });
    expect(result.status).toBe("created");
    const memberships = await fixture.db
      .select()
      .from(studentAgencies)
      .where(eq(studentAgencies.studentId, student.id));
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.agencyId).toBe(fixture.agency.id);
  });
});

describeDatabase("sign-in context hand-off", () => {
  it("establishes a usable context from an entry hand-off and reuses it", async () => {
    const fixture = await createOpenClassFixture();
    const [openClass] = await fixture.db
      .select({ id: trainingClasses.id })
      .from(trainingClasses)
      .where(eq(trainingClasses.id, fixture.classRecord.id));
    if (!openClass) throw new Error("Open class fixture was not created.");

    const cookieStore = new Map<string, string>();
    const setSpy = vi.fn((name: string, value: string) => {
      cookieStore.set(name, value);
    });
    cookiesMock.mockImplementation(async () => ({
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set: setSpy,
    }));

    // First load: no cookie, so a workflow is minted.
    const first = await establishSignInContext(fixture.db, {
      rawToken: fixture.rawToken,
      metadata,
    });
    expect(first.status).toBe("established");
    const signed = cookieStore.get("roster_sign_in_context");
    expect(signed).toBeTruthy();
    expect(setSpy).toHaveBeenCalledTimes(1);

    // The signed context loads, which is what the phone lookup depends on.
    const loaded = await loadSignInWorkflow(fixture.db, signed as string);
    expect(loaded.context.classId).toBe(openClass.id);

    // A reload reuses the context instead of resetting progress.
    const second = await establishSignInContext(fixture.db, {
      rawToken: fixture.rawToken,
      metadata,
    });
    expect(second.status).toBe("established");
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(cookieStore.get("roster_sign_in_context")).toBe(signed);
  });

  it("refuses an entry hand-off for a class that is not open", async () => {
    const fixture = await createOpenClassFixture();
    const result = await establishSignInContext(fixture.db, {
      rawToken: "not-a-real-token",
      metadata,
    });
    expect(result).toEqual({ status: "unavailable" });
  });
});
