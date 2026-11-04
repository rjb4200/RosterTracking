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
  classComponents,
  initialCertificationPrograms,
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
  const [fire] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(
      and(
        eq(reportingSystems.code, REPORTING_SYSTEM_CODES.FIRE),
        eq(reportingSystems.isActive, true),
      ),
    );
  const [emsCategory] = await db
    .select({ id: trainingCodes.id })
    .from(trainingCodes)
    .where(eq(trainingCodes.kind, "ems"))
    .limit(1);
  const [emrProgram] = await db
    .select({
      id: initialCertificationPrograms.id,
      hours: initialCertificationPrograms.hours,
      trainingCodeId: initialCertificationPrograms.trainingCodeId,
    })
    .from(initialCertificationPrograms)
    .where(eq(initialCertificationPrograms.code, "emr"));
  if (!site || !agency || !kbems || !fire || !emsCategory || !emrProgram) {
    throw new Error("EMS fixture references failed.");
  }
  return {
    siteId: site.id,
    agencyId: agency.id,
    kbemsId: kbems.id,
    fireId: fire.id,
    emsCategoryId: emsCategory.id,
    programId: emrProgram.id,
    programCategoryId: emrProgram.trainingCodeId,
    programHours: Number(emrProgram.hours),
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
  it("seeds the fixed initial-certification programs", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const programs = await db
      .select({
        code: initialCertificationPrograms.code,
        title: initialCertificationPrograms.title,
        hours: initialCertificationPrograms.hours,
      })
      .from(initialCertificationPrograms)
      .orderBy(initialCertificationPrograms.hours);
    expect(
      programs.map((program) => ({
        code: program.code,
        title: program.title,
        hours: Number(program.hours),
      })),
    ).toEqual([
      { code: "emr", title: "EMR", hours: 40 },
      { code: "emt_b", title: "EMT-B", hours: 160 },
      { code: "aemt", title: "AEMT", hours: 190 },
    ]);
  });

  it("requires the EMS details for a KBEMS class at creation", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const instructor = await createInstructor(db, suffix);
    const {
      siteId,
      agencyId,
      kbemsId,
      fireId,
      emsCategoryId,
      programId,
      programCategoryId,
      programHours,
    } = await fixtureRefs(db, suffix);
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

    // An initial-certification class requires a fixed program.
    await expect(
      createOpenClass(db, instructor, {
        ...baseInput,
        name: "EMT Initial",
        courseType: "initial_certification",
        objectives: "Initial EMT certification",
        courseNumber: "EMS-100",
      }),
    ).rejects.toThrow(/initial-certification program/i);

    // The program supplies the category, course name, and program hours.
    const initial = await createOpenClass(db, instructor, {
      ...baseInput,
      name: "EMT Initial",
      emsCategoryId: programCategoryId,
      courseType: "initial_certification",
      initialCertificationProgramId: programId,
      objectives: "Initial EMT certification",
      courseNumber: "EMS-100",
      creditedHours: 1,
    });
    expect(initial.classRecord.id).toBeTruthy();
    expect(initial.classRecord.courseNumber).toBe("EMS-100");
    expect(initial.classRecord.name).toBe("EMR");
    expect(initial.classRecord.initialCertificationProgramId).toBe(programId);
    const [programComponent] = await db
      .select()
      .from(classComponents)
      .where(eq(classComponents.classId, initial.classRecord.id));
    expect(Number(programComponent?.creditedHours)).toBe(programHours);
    expect(programComponent?.endsAt.getTime()).toBeGreaterThan(
      programComponent?.startsAt.getTime() ?? 0,
    );

    // Fire reporting cannot be combined with an initial-certification program.
    await expect(
      createOpenClass(db, instructor, {
        ...baseInput,
        name: "EMT Initial",
        emsCategoryId: programCategoryId,
        courseType: "initial_certification",
        initialCertificationProgramId: programId,
        objectives: "Initial EMT certification",
        courseNumber: "EMS-100",
        reportingSystemIds: [kbemsId, fireId],
      }),
    ).rejects.toThrow(/KBEMS-only/i);
  });
});
