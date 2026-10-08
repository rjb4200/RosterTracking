import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CLASS_STATUSES } from "../../src/modules/classes/constants";
import { listClasses } from "../../src/modules/classes/services";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  classComponents,
  finalizationRevisions,
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

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY);
}

function hoursAfter(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function createUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  suffix: string,
  roleCode: string,
) {
  const [user] = await db
    .insert(users)
    .values({
      username: `${roleCode}-${suffix}`,
      displayName: roleCode,
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode));
  if (!user || !role) throw new Error("Class list fixture user failed.");
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  return user;
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

describeDatabase("class list filters", () => {
  it("scopes the list by default, retains in-flight work, and widens with filters", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const manager = await createUser(db, suffix, ROLE_CODES.TRAINING_MAJOR);
    const actor = { id: manager.id, username: manager.username };

    const [site] = await db
      .insert(trainingSites)
      .values({ name: `Class List Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const [agency] = await db
      .insert(agencies)
      .values({ name: `Class List Agency ${suffix}` })
      .returning({ id: agencies.id });
    const [student] = await db
      .insert(students)
      .values({
        firstName: "Class",
        lastName: `List ${suffix}`,
        phone: `555-${suffix}`,
      })
      .returning({ id: students.id });
    if (!site || !agency || !student) {
      throw new Error("Class list fixture references failed.");
    }

    const createClass = async (options: {
      status: string;
      createdAt?: Date;
      sessionAt?: Date;
      attendance?: boolean;
      finalizedAt?: Date;
    }) => {
      const [record] = await db
        .insert(trainingClasses)
        .values({
          name: `Class List Course ${suffix}`,
          trainingSiteId: site.id,
          hostAgencyId: agency.id,
          createdByUserId: manager.id,
          deliveryMethod: "classroom",
          status: options.status,
          signInTokenHash: crypto.randomUUID(),
          createdAt: options.createdAt,
          cancellationReason:
            options.status === CLASS_STATUSES.CANCELLED
              ? "fixture cancellation"
              : undefined,
        })
        .returning({ id: trainingClasses.id });
      if (!record) throw new Error("Class list fixture class failed.");
      if (options.sessionAt) {
        await db.insert(classComponents).values({
          classId: record.id,
          startsAt: options.sessionAt,
          endsAt: hoursAfter(options.sessionAt, 4),
          creditedHours: "4",
          position: 0,
        });
      }
      if (options.attendance) {
        await db.insert(attendance).values({
          classId: record.id,
          studentId: student.id,
          agencyId: agency.id,
          idempotencyKey: crypto.randomUUID(),
          payloadFingerprint: "fixture",
          creditedHours: "4",
        });
      }
      if (options.finalizedAt) {
        await db.insert(finalizationRevisions).values({
          classId: record.id,
          revisionNumber: 1,
          finalizedByUserId: manager.id,
          finalizedAt: options.finalizedAt,
          encryptedSnapshot: "fixture",
          summary: {},
        });
      }
      return record.id;
    };

    const openClass = await createClass({
      status: CLASS_STATUSES.OPEN,
      createdAt: daysAgo(2),
      sessionAt: daysAgo(1),
    });
    const recentFinalized = await createClass({
      status: CLASS_STATUSES.FINALIZED,
      createdAt: daysAgo(3),
      sessionAt: daysAgo(2),
      finalizedAt: daysAgo(1),
    });
    const oldFinalized = await createClass({
      status: CLASS_STATUSES.FINALIZED,
      createdAt: daysAgo(90),
      sessionAt: daysAgo(60),
      finalizedAt: daysAgo(40),
    });
    const cancelled = await createClass({
      status: CLASS_STATUSES.CANCELLED,
      createdAt: daysAgo(4),
      sessionAt: daysAgo(3),
    });
    const inFlightOpen = await createClass({
      status: CLASS_STATUSES.OPEN,
      createdAt: daysAgo(70),
      sessionAt: daysAgo(65),
      attendance: true,
    });
    const staleEmptyOpen = await createClass({
      status: CLASS_STATUSES.OPEN,
      createdAt: daysAgo(70),
      sessionAt: daysAgo(66),
    });

    const defaultIds = (await listClasses(db, actor)).map((row) => row.id);
    expect(defaultIds).toContain(openClass);
    expect(defaultIds).toContain(recentFinalized);
    expect(defaultIds).toContain(inFlightOpen);
    expect(defaultIds).not.toContain(oldFinalized);
    expect(defaultIds).not.toContain(cancelled);
    expect(defaultIds).not.toContain(staleEmptyOpen);

    const finalizedDefaultWindow = (
      await listClasses(db, actor, { includeFinalized: true })
    ).map((row) => row.id);
    expect(finalizedDefaultWindow).toContain(recentFinalized);
    expect(finalizedDefaultWindow).not.toContain(oldFinalized);

    const withFinalized = (
      await listClasses(db, actor, {
        includeFinalized: true,
        from: daysAgo(70),
      })
    ).map((row) => row.id);
    expect(withFinalized).toContain(oldFinalized);

    const withCancelled = (
      await listClasses(db, actor, { includeCancelled: true })
    ).map((row) => row.id);
    expect(withCancelled).toContain(cancelled);

    const cancelledOnly = await listClasses(db, actor, {
      status: CLASS_STATUSES.CANCELLED,
    });
    expect(cancelledOnly.map((row) => row.id)).toContain(cancelled);
    expect(
      cancelledOnly.every((row) => row.status === CLASS_STATUSES.CANCELLED),
    ).toBe(true);

    const oldWindow = (
      await listClasses(db, actor, {
        from: daysAgo(70),
        to: daysAgo(50),
        includeFinalized: true,
      })
    ).map((row) => row.id);
    expect(oldWindow).toContain(oldFinalized);
    expect(oldWindow).toContain(inFlightOpen);

    const searched = (
      await listClasses(db, actor, { query: `Class List Course ${suffix}` })
    ).map((row) => row.id);
    expect(searched).toContain(openClass);
  });
});
