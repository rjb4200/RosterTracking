import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createOpenClass } from "../../src/modules/classes/services";
import { REPORTING_SYSTEM_CODES } from "../../src/modules/reference/constants";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  reportingSystems,
  roles,
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

async function createInstructor(db: Db, suffix: string) {
  const [user] = await db
    .insert(users)
    .values({
      username: `ems-${suffix}`,
      displayName: "EMS Instructor",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, ROLE_CODES.INSTRUCTOR));
  if (!user || !role) throw new Error("EMS fixture user failed.");
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  return user;
}

async function fixtureRefs(db: Db, suffix: string) {
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `EMS Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `EMS Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [kbems] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(
      and(
        eq(reportingSystems.code, REPORTING_SYSTEM_CODES.KBEMS),
        eq(reportingSystems.isActive, true),
      ),
    );
  const [emsCategory] = await db
    .select({ id: trainingCodes.id })
    .from(trainingCodes)
    .where(eq(trainingCodes.kind, "ems"))
    .limit(1);
  if (!site || !agency || !kbems || !emsCategory) {
    throw new Error("EMS fixture references failed.");
  }
  return {
    siteId: site.id,
    agencyId: agency.id,
    kbemsId: kbems.id,
    emsCategoryId: emsCategory.id,
  };
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

describeDatabase("EMS course details", () => {
  it("requires the EMS details for a KBEMS class at creation", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const instructor = await createInstructor(db, suffix);
    const { siteId, agencyId, kbemsId, emsCategoryId } = await fixtureRefs(
      db,
      suffix,
    );
    const baseInput = {
      name: "EMT Refresher",
      trainingSiteId: siteId,
      hostAgencyId: agencyId,
      deliveryMethod: "classroom" as const,
      startsAt: "2026-09-10T09:00",
      creditedHours: 4,
      leadInstructorId: instructor.id,
      reportingSystemIds: [kbemsId],
      accessPinEnabled: false,
      emsCategoryId,
    };

    await expect(
      createOpenClass(db, instructor, {
        ...baseInput,
        name: "",
        courseType: "refresher",
        objectives: "Review of EMT skills",
      }),
    ).rejects.toThrow(/EMS course name/i);
    await expect(
      createOpenClass(db, instructor, {
        ...baseInput,
        courseType: "",
        objectives: "Review of EMT skills",
      }),
    ).rejects.toThrow(/course type/i);
    await expect(
      createOpenClass(db, instructor, {
        ...baseInput,
        courseType: "refresher",
        objectives: "",
      }),
    ).rejects.toThrow(/description/i);
    await expect(
      createOpenClass(db, instructor, {
        ...baseInput,
        courseType: "initial_certification",
        objectives: "Initial EMT certification",
        courseNumber: "",
      }),
    ).rejects.toThrow(/course number/i);

    // A non-initial class needs no course number.
    const refresher = await createOpenClass(db, instructor, {
      ...baseInput,
      courseType: "refresher",
      objectives: "Review of EMT skills",
    });
    expect(refresher.classRecord.id).toBeTruthy();
    expect(refresher.classRecord.courseNumber).toBeNull();

    // A non-initial class is also accepted with a course number.
    const refresherWithNumber = await createOpenClass(db, instructor, {
      ...baseInput,
      courseType: "refresher",
      objectives: "Review of EMT skills",
      courseNumber: "A0000",
    });
    expect(refresherWithNumber.classRecord.courseNumber).toBe("A0000");

    // An initial-certification class is accepted with a course number.
    const initial = await createOpenClass(db, instructor, {
      ...baseInput,
      name: "EMT Initial",
      courseType: "initial_certification",
      objectives: "Initial EMT certification",
      courseNumber: "EMS-100",
    });
    expect(initial.classRecord.id).toBeTruthy();
    expect(initial.classRecord.courseNumber).toBe("EMS-100");
  });
});
