import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createOpenClass,
  listClassFormOptions,
} from "../../src/modules/classes/services";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  curricula,
  reportingRequirementSets,
  reportingSystems,
  trainingCodes,
  trainingSites,
} from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";
import { createStaffUser } from "./support/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function createInstructor(db: Db, suffix: string) {
  return createStaffUser(db, {
    username: `recent-${suffix}`,
    displayName: "Recent Instructor",
  });
}

async function activeSetId(db: Db, code: string) {
  const [system] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(eq(reportingSystems.code, code));
  if (!system) throw new Error(`Reporting system ${code} is missing.`);
  const [set] = await db
    .select({ id: reportingRequirementSets.id })
    .from(reportingRequirementSets)
    .where(
      and(
        eq(reportingRequirementSets.reportingSystemId, system.id),
        eq(reportingRequirementSets.isActive, true),
      ),
    );
  if (!set) throw new Error(`Reporting system ${code} has no active set.`);
  return { systemId: system.id, setId: set.id };
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

describeDatabase("recent curricula options", () => {
  it("lists the curricula of the actor's recent classes", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const instructor = await createInstructor(db, suffix);
    const [site] = await db
      .insert(trainingSites)
      .values({ name: `Recent Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const [agency] = await db
      .insert(agencies)
      .values({ name: `Recent Agency ${suffix}` })
      .returning({ id: agencies.id });
    const [trainingCode] = await db
      .insert(trainingCodes)
      .values({
        code: `KR-${suffix.slice(0, 6)}`,
        title: "Hose Loads",
        sourceRevision: "test",
      })
      .returning({ id: trainingCodes.id });
    const [curriculum] = await db
      .insert(curricula)
      .values({
        publisher: "IFSTA",
        programTitle: `Recent Essentials ${suffix}`,
        version: "8th Edition",
        sourceRevision: "test",
      })
      .returning({ id: curricula.id });
    if (!site || !agency || !trainingCode || !curriculum) {
      throw new Error("Recent fixture references failed.");
    }
    const { systemId } = await activeSetId(db, "fire");
    await createOpenClass(db, instructor, {
      name: `Recent Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      deliveryMethod: "classroom",
      startsAt: "2026-09-10T09:00",
      creditedHours: 4,
      leadInstructorId: instructor.id,
      reportingSystemIds: [systemId],
      accessPinEnabled: false,
      subjects: [
        {
          trainingCodeId: trainingCode.id,
          className: "Hose Loads",
          curriculumId: curriculum.id,
          lessonPlan: "",
        },
      ],
    });

    const options = await listClassFormOptions(db, instructor);
    expect(options.recentCurriculumIds).toContain(curriculum.id);
  });
});
