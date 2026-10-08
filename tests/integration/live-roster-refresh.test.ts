import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getClassRosterRefresh } from "../../src/modules/instructor-roster/services";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  classComponents,
  classGuests,
  classInstructors,
  trainingClasses,
  trainingSites,
  users,
} from "../../src/server/db/schema";

async function addGuestAttendance(
  db: ReturnType<typeof drizzle<typeof schema>>,
  input: {
    classId: string;
    agencyId: string;
    firstName: string;
    lastName: string;
  },
) {
  const [guest] = await db
    .insert(classGuests)
    .values({
      classId: input.classId,
      firstName: input.firstName,
      lastName: input.lastName,
    })
    .returning({ id: classGuests.id });
  if (!guest) throw new Error("Guest creation failed.");
  const [record] = await db
    .insert(attendance)
    .values({
      classId: input.classId,
      guestId: guest.id,
      agencyId: input.agencyId,
      idempotencyKey: crypto.randomUUID(),
      payloadFingerprint: "fixture",
      creditedHours: "4",
    })
    .returning({ id: attendance.id });
  if (!record) throw new Error("Attendance creation failed.");
  return record.id;
}

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

async function createFixture() {
  if (!pool) throw new Error("TEST_DATABASE_URL is required.");
  const db = drizzle(pool, { schema });
  const suffix = crypto.randomUUID();
  const [instructor] = await db
    .insert(users)
    .values({
      username: `live-roster-${suffix}`,
      displayName: "Live Roster Instructor",
      passwordHash: "hash",
    })
    .returning({ id: users.id, username: users.username });
  const [outsider] = await db
    .insert(users)
    .values({
      username: `live-roster-outsider-${suffix}`,
      displayName: "Unassigned Staff",
      passwordHash: "hash",
    })
    .returning({ id: users.id, username: users.username });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Live Roster Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Live Roster Agency ${suffix}` })
    .returning({ id: agencies.id, name: agencies.name });
  if (!instructor || !outsider || !site || !agency)
    throw new Error("Fixture creation failed.");
  const [classRecord] = await db
    .insert(trainingClasses)
    .values({
      name: `Live Roster Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      createdByUserId: instructor.id,
      deliveryMethod: "classroom",
      status: "open",
      signInTokenHash: crypto.randomUUID(),
    })
    .returning({ id: trainingClasses.id });
  if (!classRecord) throw new Error("Class creation failed.");
  await db
    .insert(classInstructors)
    .values({ classId: classRecord.id, userId: instructor.id, isLead: true });
  await db.insert(classComponents).values({
    classId: classRecord.id,
    startsAt: new Date("2026-09-10T13:00:00Z"),
    endsAt: new Date("2026-09-10T17:00:00Z"),
    creditedHours: "4",
  });
  return {
    db,
    instructor: { id: instructor.id, username: instructor.username },
    outsider: { id: outsider.id, username: outsider.username },
    agency,
    classRecord,
  };
}

describeDatabase("live roster refresh", () => {
  it("serves an assigned instructor the roster and a bounded deadline", async () => {
    const fixture = await createFixture();
    await addGuestAttendance(fixture.db, {
      classId: fixture.classRecord.id,
      agencyId: fixture.agency.id,
      firstName: "Live",
      lastName: "Guest",
    });

    const payload = await getClassRosterRefresh(
      fixture.db,
      fixture.instructor,
      fixture.classRecord.id,
    );

    expect(payload.status).toBe("open");
    expect(payload.scheduledHours).toBe(4);
    expect(payload.refreshDeadline).toBe("2026-09-10T21:00:00.000Z");
    expect(payload.active).toHaveLength(1);
    expect(payload.active[0]).toMatchObject({
      name: "Live Guest",
      agencyName: fixture.agency.name,
    });
    expect(payload.active[0]?.signedInAtLabel).toBeTruthy();
  });

  it("refuses staff who are not assigned to the class", async () => {
    const fixture = await createFixture();
    await expect(
      getClassRosterRefresh(
        fixture.db,
        fixture.outsider,
        fixture.classRecord.id,
      ),
    ).rejects.toThrow(/unavailable/i);
  });

  it("reports the new status once the class leaves open so the client can refresh", async () => {
    const fixture = await createFixture();
    await fixture.db
      .update(trainingClasses)
      .set({ status: "finalized" })
      .where(eq(trainingClasses.id, fixture.classRecord.id));

    const payload = await getClassRosterRefresh(
      fixture.db,
      fixture.instructor,
      fixture.classRecord.id,
    );
    expect(payload.status).toBe("finalized");
  });

  it("refuses a class that is no longer readable", async () => {
    const fixture = await createFixture();
    await fixture.db
      .update(trainingClasses)
      .set({ status: "cancelled", cancellationReason: "fixture cancellation" })
      .where(eq(trainingClasses.id, fixture.classRecord.id));

    await expect(
      getClassRosterRefresh(
        fixture.db,
        fixture.instructor,
        fixture.classRecord.id,
      ),
    ).rejects.toThrow(/unavailable/i);
  });
});
