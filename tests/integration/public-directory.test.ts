import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { listPublicOpenClasses } from "../../src/modules/classes/services";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  classComponents,
  classInstructors,
  trainingClasses,
  trainingSites,
  users,
} from "../../src/server/db/schema";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePublicCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(
    bytes,
    (byte) => PUBLIC_CODE_ALPHABET[byte % PUBLIC_CODE_ALPHABET.length],
  ).join("");
}

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

describeDatabase("public class directory", () => {
  it("lists open classes with their earliest session and ordered instructors", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const manager = await db
      .insert(users)
      .values({
        username: `directory-${suffix}`,
        displayName: "Directory Manager",
        passwordHash: "fixture",
      })
      .returning({ id: users.id });
    const agency = await db
      .insert(agencies)
      .values({ name: `Directory Agency ${suffix}` })
      .returning({ id: agencies.id });
    const site = await db
      .insert(trainingSites)
      .values({ name: `Directory Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const managerId = manager[0]?.id;
    const agencyId = agency[0]?.id;
    const siteId = site[0]?.id;
    if (!managerId || !agencyId || !siteId) {
      throw new Error("Directory fixtures failed.");
    }

    const lead = await db
      .insert(users)
      .values({
        username: `directory-lead-${suffix}`,
        displayName: "Zoe Adams",
        passwordHash: "fixture",
      })
      .returning({ id: users.id });
    const member = await db
      .insert(users)
      .values({
        username: `directory-member-${suffix}`,
        displayName: "Amy Baker",
        passwordHash: "fixture",
      })
      .returning({ id: users.id });
    const leadId = lead[0]?.id;
    const memberId = member[0]?.id;
    if (!leadId || !memberId) throw new Error("Instructor fixtures failed.");

    const publicCodeA = generatePublicCode();
    const publicCodeB = generatePublicCode();
    const publicCodeC = generatePublicCode();
    const classA = await db
      .insert(trainingClasses)
      .values({
        name: `Directory Course A ${suffix}`,
        trainingSiteId: siteId,
        hostAgencyId: agencyId,
        createdByUserId: managerId,
        deliveryMethod: "classroom",
        status: "open",
        signInTokenHash: crypto.randomUUID(),
        publicCode: publicCodeA,
        openedAt: new Date(),
      })
      .returning({ id: trainingClasses.id });
    const classB = await db
      .insert(trainingClasses)
      .values({
        name: `Directory Course B ${suffix}`,
        hostAgencyId: agencyId,
        createdByUserId: managerId,
        deliveryMethod: "online",
        status: "open",
        signInTokenHash: crypto.randomUUID(),
        publicCode: publicCodeB,
        openedAt: new Date(),
      })
      .returning({ id: trainingClasses.id });
    const classC = await db
      .insert(trainingClasses)
      .values({
        name: `Directory Course C ${suffix}`,
        trainingSiteId: siteId,
        hostAgencyId: agencyId,
        createdByUserId: managerId,
        deliveryMethod: "classroom",
        status: "cancelled",
        cancellationReason: "fixture",
        signInTokenHash: crypto.randomUUID(),
        publicCode: publicCodeC,
      })
      .returning({ id: trainingClasses.id });
    const publicCodeD = generatePublicCode();
    const classD = await db
      .insert(trainingClasses)
      .values({
        name: `Directory Course C ${suffix}`,
        trainingSiteId: siteId,
        hostAgencyId: agencyId,
        createdByUserId: managerId,
        deliveryMethod: "classroom",
        status: "open",
        signInTokenHash: crypto.randomUUID(),
        publicCode: publicCodeD,
        openedAt: new Date(),
      })
      .returning({ id: trainingClasses.id });
    const classAId = classA[0]?.id;
    const classBId = classB[0]?.id;
    const classDId = classD[0]?.id;
    if (!classAId || !classBId || !classC[0]?.id || !classDId) {
      throw new Error("Class fixtures failed.");
    }

    const now = Date.now();
    const earlier = new Date(now - 60 * 60 * 1000);
    const later = new Date(now + 60 * 60 * 1000);
    const farFuture = new Date(now + 3 * 24 * 60 * 60 * 1000);
    await db.insert(classComponents).values([
      {
        classId: classAId,
        startsAt: later,
        endsAt: new Date(later.getTime() + 4 * 60 * 60 * 1000),
        creditedHours: "4",
        position: 1,
      },
      {
        classId: classAId,
        startsAt: earlier,
        endsAt: new Date(earlier.getTime() + 4 * 60 * 60 * 1000),
        creditedHours: "4",
        position: 0,
      },
      {
        classId: classBId,
        startsAt: earlier,
        endsAt: new Date(earlier.getTime() + 4 * 60 * 60 * 1000),
        creditedHours: "4",
        position: 0,
      },
      {
        classId: classDId,
        startsAt: farFuture,
        endsAt: new Date(farFuture.getTime() + 4 * 60 * 60 * 1000),
        creditedHours: "4",
        position: 0,
      },
    ]);
    await db.insert(classInstructors).values([
      { classId: classAId, userId: memberId, isLead: false },
      { classId: classAId, userId: leadId, isLead: true },
      { classId: classBId, userId: leadId, isLead: true },
    ]);

    const directory = await listPublicOpenClasses(db);
    const entryA = directory.find((entry) => entry.publicCode === publicCodeA);
    const entryB = directory.find((entry) => entry.publicCode === publicCodeB);
    const entryC = directory.find((entry) => entry.publicCode === publicCodeC);
    const entryD = directory.find((entry) => entry.publicCode === publicCodeD);

    expect(entryA).toMatchObject({
      courseName: `Directory Course A ${suffix}`,
      location: `Directory Site ${suffix}`,
    });
    expect(entryA?.nextSession?.getTime()).toBe(earlier.getTime());
    expect(entryA?.instructors).toEqual(["Z. Adams", "A. Baker"]);

    expect(entryB).toMatchObject({
      courseName: `Directory Course B ${suffix}`,
      location: "Virtual",
    });
    expect(entryB?.nextSession?.getTime()).toBe(earlier.getTime());
    expect(entryB?.instructors).toEqual(["Z. Adams"]);

    expect(entryC).toBeUndefined();
    expect(entryD).toBeUndefined();
  });
});
