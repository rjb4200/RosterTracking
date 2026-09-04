import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  addManualGuestAttendance,
  adjustCreditedHours,
  removeAttendance,
} from "../../src/modules/instructor-roster/services";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  classComponents,
  classInstructors,
  courses,
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
  if (pool)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: "drizzle" });
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("instructor roster transactions", () => {
  it("records a manual guest, retains removal, and allows bounded credit", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const [actor] = await db
      .insert(users)
      .values({
        username: `roster-${suffix}`,
        displayName: "Roster Instructor",
        passwordHash: "hash",
      })
      .returning({ id: users.id, username: users.username });
    const [course] = await db
      .insert(courses)
      .values({ name: `Roster Course ${suffix}` })
      .returning({ id: courses.id });
    const [site] = await db
      .insert(trainingSites)
      .values({ name: `Roster Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const [agency] = await db
      .insert(agencies)
      .values({ name: `Roster Agency ${suffix}` })
      .returning({ id: agencies.id });
    if (!actor || !course || !site || !agency)
      throw new Error("Fixture creation failed.");
    const [classRecord] = await db
      .insert(trainingClasses)
      .values({
        courseId: course.id,
        trainingSiteId: site.id,
        createdByUserId: actor.id,
        deliveryMethod: "in_person",
        status: "open",
        signInTokenHash: crypto.randomUUID(),
      })
      .returning({ id: trainingClasses.id });
    if (!classRecord) throw new Error("Class creation failed.");
    await db
      .insert(classInstructors)
      .values({ classId: classRecord.id, userId: actor.id, isLead: true });
    await db.insert(classComponents).values({
      classId: classRecord.id,
      startsAt: new Date("2026-09-10T13:00:00Z"),
      endsAt: new Date("2026-09-10T17:00:00Z"),
      creditedHours: "4",
    });
    const attendanceId = await addManualGuestAttendance(db, actor, {
      classId: classRecord.id,
      agencyId: agency.id,
      firstName: "Guest",
      lastName: "Roster",
      fields: {},
      credentials: {},
    });
    await expect(
      adjustCreditedHours(db, actor, attendanceId, 4.1, "Too high"),
    ).rejects.toThrow(/between zero/i);
    await adjustCreditedHours(db, actor, attendanceId, 3.5, "Left early");
    await removeAttendance(db, actor, attendanceId, "Entered in error");
    const [stored] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, attendanceId));
    expect(stored).toMatchObject({
      creditedHours: "3.50",
      removalReason: "Entered in error",
      isManual: true,
      manualRecordedByUserId: actor.id,
    });
  });
});
