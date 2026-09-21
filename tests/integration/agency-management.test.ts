import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createOpenClass } from "../../src/modules/classes/services";
import {
  createAgency,
  setAgencyActive,
  setStudentMembership,
} from "../../src/modules/reference/services";
import { resolveRegularAttendanceAgencies } from "../../src/modules/student-sign-in/participants";
import type { Database } from "../../src/server/db/client";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  courses,
  students,
  trainingSites,
  users,
} from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

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

async function createActor(db: Database) {
  const suffix = crypto.randomUUID();
  const [actor] = await db
    .insert(users)
    .values({
      username: `agency-actor-${suffix}`,
      displayName: "Agency Actor",
      passwordHash: "not-a-real-hash",
    })
    .returning({ id: users.id, username: users.username });
  if (!actor) throw new Error("Agency actor fixture failed.");
  return actor;
}

describeDatabase("agency management and host agency", () => {
  it("rejects a duplicate agency name ignoring case and surrounding space", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Winchester Test ${crypto.randomUUID()}`;
    await createAgency(db, actor, { name });
    await expect(
      createAgency(db, actor, { name: `  ${name.toUpperCase()}  ` }),
    ).rejects.toThrow(/already exists/i);
  });

  it("requires an active host agency when creating a class", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const suffix = crypto.randomUUID();
    const [course] = await db
      .insert(courses)
      .values({ name: `Host Agency Course ${suffix}` })
      .returning({ id: courses.id });
    const [site] = await db
      .insert(trainingSites)
      .values({ name: `Host Agency Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const agency = await createAgency(db, actor, {
      name: `Inactive Agency ${suffix}`,
    });
    await setAgencyActive(db, actor, agency.id, false);
    if (!course || !site) throw new Error("Host agency fixtures failed.");

    await expect(
      createOpenClass(db, actor, {
        courseId: course.id,
        trainingSiteId: site.id,
        hostAgencyId: agency.id,
        deliveryMethod: "classroom",
        startsAt: "2026-09-10T13:00:00Z",
        creditedHours: 4,
        leadInstructorId: actor.id,
      }),
    ).rejects.toThrow(/active host agency/i);
  });

  it("offers the catalog and preselects a default agency", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const suffix = crypto.randomUUID();
    const host = await createAgency(db, actor, {
      name: `Host ${suffix}`,
    });
    const other = await createAgency(db, actor, {
      name: `Other ${suffix}`,
    });
    const [student] = await db
      .insert(students)
      .values({
        firstName: "Resolver",
        lastName: `Student ${suffix}`,
        phone: `+1859${Math.floor(Math.random() * 10_000_000)
          .toString()
          .padStart(7, "0")}`,
      })
      .returning({ id: students.id });
    if (!student) throw new Error("Resolver student fixture failed.");

    const withoutMembership = await resolveRegularAttendanceAgencies(
      db,
      student.id,
      host.id,
    );
    expect(
      withoutMembership.agencies.some((agency) => agency.id === other.id),
    ).toBe(true);
    expect(withoutMembership.preselectedAgencyId).toBe(host.id);

    await setStudentMembership(db, actor, student.id, other.id, {
      isPrimary: true,
      isActive: true,
    });
    const withMembership = await resolveRegularAttendanceAgencies(
      db,
      student.id,
      host.id,
    );
    expect(withMembership.preselectedAgencyId).toBe(other.id);
  });
});
