import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getClassSignInRecord } from "../../src/modules/class-sign-in-record/service";
import { finalizeClass } from "../../src/modules/classes/finalization";
import { hashClassSignInToken } from "../../src/modules/classes/token";
import {
  getRosterReadiness,
  saveCertificateDisposition,
} from "../../src/modules/instructor-roster/services";
import { decryptCredential } from "../../src/modules/reference/crypto";
import { confirmAttendance } from "../../src/modules/student-sign-in/attendance";
import { createWorkflowFromClassToken } from "../../src/modules/student-sign-in/workflow";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceCertificateDispositions,
  attendanceCheckIns,
  classComponents,
  classInstructors,
  finalizationRevisions,
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

type Db = ReturnType<typeof drizzle<typeof schema>>;

const request = {
  ipAddress: "203.0.113.10",
  requestSourceFingerprint: "daily-check-in-source",
  requestCorrelationId: "daily-check-in-correlation",
};

async function createFixture(db: Db, options: { courseType?: string } = {}) {
  const suffix = crypto.randomUUID();
  const rawToken = crypto.randomUUID();
  const [actor] = await db
    .insert(users)
    .values({
      username: `daily-${suffix}`,
      displayName: "Daily Instructor",
      passwordHash: "not-a-real-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Daily Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Daily Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!actor || !site || !agency) {
    throw new Error("Daily check-in fixtures were not created.");
  }
  const [classRecord] = await db
    .insert(trainingClasses)
    .values({
      name: `Daily Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      createdByUserId: actor.id,
      deliveryMethod: "classroom",
      courseType: options.courseType ?? "initial_certification",
      courseNumber: "126-26-02-B",
      objectives: "Daily program",
      status: "open",
      signInTokenHash: hashClassSignInToken(rawToken),
      openedAt: new Date("2026-09-10T12:00:00Z"),
    })
    .returning({ id: trainingClasses.id });
  if (!classRecord) throw new Error("Daily check-in class was not created.");
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
  return { db, actor, agencyId: agency.id, classId: classRecord.id, rawToken };
}

async function createStudent(db: Db, firstName: string, lastName: string) {
  const [student] = await db
    .insert(students)
    .values({
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}-${crypto.randomUUID()}@example.com`,
      phone: `+1859${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, "0")}`,
    })
    .returning({ id: students.id });
  if (!student) throw new Error("Student fixture was not created.");
  return student.id;
}

async function signIn(
  db: Db,
  rawToken: string,
  agencyId: string,
  studentId: string,
  at: Date,
) {
  const workflow = await createWorkflowFromClassToken(
    db,
    rawToken,
    {
      participant: {
        kind: "regular",
        studentId,
        signInMethod: "current_phone",
        profileConfirmed: true,
        fields: {},
        credentials: [],
      },
      selectedAgencyId: agencyId,
      pendingNewPhone: null,
      requirementSets: [],
    },
    at,
  );
  if (!workflow) throw new Error("Workflow was not created.");
  return confirmAttendance(
    db,
    workflow.token,
    {
      attestationConfirmed: true,
      rememberDevice: false,
      request,
    },
    at,
  );
}

beforeAll(async () => {
  vi.stubEnv("AUTH_SECRET", "integration-auth-secret-at-least-32-characters");
  vi.stubEnv(
    "CREDENTIAL_ENCRYPTION_KEY",
    "WfAtPIckXdR1AkTmkBZOPGTns2gUyVLExMfK/1islVM=",
  );
  if (!pool) return;
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.transaction(seedReferenceData);
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("daily class check-ins", () => {
  it("records the first scan and later dates without a second attendance", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const fixture = await createFixture(db);
    const studentId = await createStudent(db, "Ada", "Daily");

    const first = await signIn(
      db,
      fixture.rawToken,
      fixture.agencyId,
      studentId,
      new Date("2026-09-10T13:00:00Z"),
    );
    const later = await signIn(
      db,
      fixture.rawToken,
      fixture.agencyId,
      studentId,
      new Date("2026-09-12T13:00:00Z"),
    );
    const repeat = await signIn(
      db,
      fixture.rawToken,
      fixture.agencyId,
      studentId,
      new Date("2026-09-12T14:00:00Z"),
    );

    expect(first.status).toBe("created");
    expect(later.status).toBe("created");
    expect(repeat.status).toBe("already_signed_in");
    expect(later.attendanceId).toBe(first.attendanceId);
    expect(
      await db
        .select()
        .from(attendance)
        .where(eq(attendance.classId, fixture.classId)),
    ).toHaveLength(1);
    const checkIns = await db
      .select()
      .from(attendanceCheckIns)
      .where(eq(attendanceCheckIns.attendanceId, first.attendanceId));
    expect(checkIns.map((checkIn) => checkIn.checkInDate)).toEqual([
      "2026-09-10",
      "2026-09-12",
    ]);
  });

  it("keeps non-initial classes on the single-attendance behavior", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const fixture = await createFixture(db, {
      courseType: "continuing_education",
    });
    const studentId = await createStudent(db, "Grace", "Single");
    const first = await signIn(
      db,
      fixture.rawToken,
      fixture.agencyId,
      studentId,
      new Date("2026-09-10T13:00:00Z"),
    );
    const repeat = await signIn(
      db,
      fixture.rawToken,
      fixture.agencyId,
      studentId,
      new Date("2026-09-12T13:00:00Z"),
    );
    expect(first.status).toBe("created");
    expect(repeat.status).toBe("already_signed_in");
    expect(
      await db
        .select()
        .from(attendanceCheckIns)
        .where(eq(attendanceCheckIns.attendanceId, first.attendanceId)),
    ).toHaveLength(0);
  });

  it("groups the record by date and flags missing days until a disposition is saved", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const fixture = await createFixture(db);
    const full = await createStudent(db, "Full", "Attendance");
    const missing = await createStudent(db, "Missing", "Day");
    await signIn(
      db,
      fixture.rawToken,
      fixture.agencyId,
      full,
      new Date("2026-09-10T13:00:00Z"),
    );
    await signIn(
      db,
      fixture.rawToken,
      fixture.agencyId,
      full,
      new Date("2026-09-12T13:00:00Z"),
    );
    await signIn(
      db,
      fixture.rawToken,
      fixture.agencyId,
      missing,
      new Date("2026-09-10T13:00:00Z"),
    );

    const record = await getClassSignInRecord(
      db,
      fixture.actor,
      fixture.classId,
    );
    expect(record.days?.map((day) => day.date)).toEqual([
      "2026-09-10",
      "2026-09-12",
    ]);
    expect(record.days?.[0]?.entries).toHaveLength(2);
    expect(record.days?.[1]?.entries).toHaveLength(1);

    const before = await getRosterReadiness(db, fixture.actor, fixture.classId);
    expect(before.ready).toBe(false);
    expect(before.missingDayStudents).toEqual([
      expect.objectContaining({
        name: "Missing Day",
        missingDates: ["2026-09-12"],
        disposition: null,
      }),
    ]);

    const missingAttendance = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(
        and(
          eq(attendance.classId, fixture.classId),
          eq(attendance.studentId, missing),
        ),
      );
    if (!missingAttendance[0]) throw new Error("Missing attendance not found.");
    await saveCertificateDisposition(db, fixture.actor, {
      classId: fixture.classId,
      attendanceId: missingAttendance[0].id,
      decision: "include",
      note: "Made up the missed day",
    });
    const after = await getRosterReadiness(db, fixture.actor, fixture.classId);
    expect(after.ready).toBe(true);
    expect(after.missingDayStudents[0]?.disposition).toMatchObject({
      decision: "include",
      note: "Made up the missed day",
      resolvedByName: "Daily Instructor",
    });

    const revision = await finalizeClass(db, fixture.actor, fixture.classId, {
      certified: true,
      typedName: "Daily Instructor",
    });
    const [row] = await db
      .select({ encryptedSnapshot: finalizationRevisions.encryptedSnapshot })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    if (!row) throw new Error("Finalization revision was not stored.");
    const snapshot = JSON.parse(decryptCredential(row.encryptedSnapshot)) as {
      checkIns: Array<{ checkInDate: string }>;
      dispositions: Array<{ decision: string; note: string }>;
      signInRecord?: { days?: Array<{ date: string; entries: unknown[] }> };
    };
    expect(snapshot.checkIns.map((checkIn) => checkIn.checkInDate)).toEqual([
      "2026-09-10",
      "2026-09-10",
      "2026-09-12",
    ]);
    expect(snapshot.dispositions).toEqual([
      expect.objectContaining({
        decision: "include",
        note: "Made up the missed day",
      }),
    ]);
    expect(snapshot.signInRecord?.days?.map((day) => day.date)).toEqual([
      "2026-09-10",
      "2026-09-12",
    ]);
    expect(
      await db
        .select()
        .from(attendanceCertificateDispositions)
        .where(
          eq(
            attendanceCertificateDispositions.attendanceId,
            missingAttendance[0].id,
          ),
        ),
    ).toHaveLength(1);
  });
});
