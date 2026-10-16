import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createOpenClass,
  getClassDetail,
} from "../../src/modules/classes/services";
import {
  createTrainingCode,
  importTrainingCodes,
  listTrainingCodes,
} from "../../src/modules/reference/services";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
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

async function activeSystemId(db: Db, code: string) {
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
  return system.id;
}

describeDatabase("training categories", () => {
  it("seeds the EMS categories with the core group first and military TCCC excluded", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const ems = (await listTrainingCodes(db, "", "ems")).filter(
      (row) => row.sourceRevision === "ems-2024",
    );
    const names = ems.map((row) => row.title);
    expect(names.slice(0, 5)).toEqual([
      "Airway",
      "Cardiology",
      "Medical",
      "Operations",
      "Trauma",
    ]);
    expect(ems.slice(0, 5).every((row) => row.categoryGroup === "core")).toBe(
      true,
    );
    expect(names).toContain("CPR - Healthcare Professional");
    expect(names).toContain("Advanced Cardiac Life Support");
    expect(names).toContain(
      "IS-700.B: An Introduction to the National Incident Management System",
    );
    expect(names.some((name) => name.includes("TCCC"))).toBe(false);
    // The course group is the full seeded list in alphabetical order.
    const courses = names.slice(5);
    expect(courses).toEqual([
      "Advanced Burn Life Support",
      "Advanced Cardiac Life Support",
      "Advanced Disaster Life Support",
      "Advanced Life Support",
      "Advanced Medical Life Support",
      "Advanced Pediatric Life Support",
      "Advanced Stroke Life Support",
      "Advanced Trauma Life Support",
      "All Hazards Disaster Life Support",
      "An Introduction to the Incident Command System, ICS 100",
      "An Introduction to the National Incident Management System",
      "Basic Disaster Life Support",
      "CPR - Healthcare Professional",
      "Emergency Medical Patients: Assessment, Care and Transport",
      "Emergency Neurological Life Support",
      "Emergency Pediatric Course",
      "Emergency Vehicle Operator Course / Safety",
      "EMS Safety",
      "Geriatric Education for EMS",
      "Hazardous Materials Awareness",
      "Hazardous Materials Operations",
      "Hazardous Materials Technician",
      "ICS 300: Intermediate Incident Command System for Expanding Incidents",
      "ICS 400: Advanced Incident Command System for Command and General Staff - Complex Incidents",
      "International Trauma Life Support",
      "IS-700.B: An Introduction to the National Incident Management System",
      "IS-800.D: National Response Framework, An Introduction",
      "Neonatal Resuscitation Program",
      "Pediatric Advanced Life Support",
      "Pediatric Education for Prehospital Professionals",
      "Pediatric Emergency Assessment, Recognition and Stabilization",
      "Prehospital Trauma Life Support",
      "Tactical Emergency Casualty Care (Civilian)",
      "Traffic Incident Management",
    ]);
  });

  it("seeds a matching Fire and EMS pair mapping symmetrically", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const [fire] = await db
      .select()
      .from(trainingCodes)
      .where(
        and(eq(trainingCodes.kind, "fire"), eq(trainingCodes.code, "P0008")),
      )
      .limit(1);
    if (!fire) throw new Error("Fire code P0008 is missing.");
    const [ems] = await db
      .select()
      .from(trainingCodes)
      .where(
        and(eq(trainingCodes.kind, "ems"), eq(trainingCodes.code, "Airway")),
      )
      .limit(1);
    if (!ems) throw new Error("EMS category Airway is missing.");
    expect(fire.mapsToId).toBe(ems.id);
    expect(ems.mapsToId).toBe(fire.id);
  });

  it("does not overwrite staff edits or duplicate on re-seed", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const before = await listTrainingCodes(db, "", "ems");
    const target = before.find((row) => row.code === "EMS Safety");
    if (!target) throw new Error("Seeded EMS category EMS Safety is missing.");
    await db
      .update(trainingCodes)
      .set({ title: "EMS Safety (edited)" })
      .where(eq(trainingCodes.id, target.id));

    await db.transaction(seedReferenceData);

    const after = await listTrainingCodes(db, "", "ems");
    expect(after).toHaveLength(before.length);
    expect(after.find((row) => row.id === target.id)?.title).toBe(
      "EMS Safety (edited)",
    );
  });

  it("does not archive EMS categories when a Fire list is imported", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createStaffUser(db, {
      username: `tc-import-${crypto.randomUUID().slice(0, 8)}`,
      displayName: "Training Category Importer",
    });
    const revision = `rev-${crypto.randomUUID().slice(0, 8)}`;
    try {
      await importTrainingCodes(db, actor, [
        {
          kind: "fire",
          code: `F-${revision}`,
          title: "Fire",
          sourceRevision: revision,
        },
      ]);
      const ems = await listTrainingCodes(db, "", "ems");
      expect(ems.some((row) => row.code === "Airway")).toBe(true);
    } finally {
      // The import retires Fire entries outside its list; restore the catalog.
      await db
        .update(trainingCodes)
        .set({ isActive: true, archivedAt: null })
        .where(eq(trainingCodes.kind, "fire"));
    }
  });

  it("orders Fire categories alphabetically by label", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createStaffUser(db, {
      username: `tc-order-${crypto.randomUUID().slice(0, 8)}`,
      displayName: "Training Category Author",
    });
    const revision = `order-${crypto.randomUUID().slice(0, 8)}`;
    await createTrainingCode(db, actor, {
      kind: "fire",
      code: `ORD-${revision}-b`,
      title: `Zulu ${revision}`,
      sourceRevision: revision,
    });
    await createTrainingCode(db, actor, {
      kind: "fire",
      code: `ORD-${revision}-a`,
      title: `Alpha ${revision}`,
      sourceRevision: revision,
    });
    const listed = await listTrainingCodes(db, revision, "fire");
    expect(listed.map((row) => row.title)).toEqual([
      `Alpha ${revision}`,
      `Zulu ${revision}`,
    ]);
  });

  it("treats the same code in different kinds as distinct records", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createStaffUser(db, {
      username: `tc-kind-${crypto.randomUUID().slice(0, 8)}`,
      displayName: "Training Category Author",
    });
    const revision = `kind-${crypto.randomUUID().slice(0, 8)}`;
    const code = `SHARED-${revision}`;
    const fire = await createTrainingCode(db, actor, {
      kind: "fire",
      code,
      title: "Shared Fire",
      sourceRevision: revision,
    });
    const ems = await createTrainingCode(db, actor, {
      kind: "ems",
      code,
      title: "Shared EMS",
      sourceRevision: revision,
    });
    expect(fire.id).not.toBe(ems.id);
    expect(fire.kind).toBe("fire");
    expect(ems.kind).toBe("ems");
  });

  it("persists the selected EMS category on a class", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const instructor = await createStaffUser(db, {
      username: `tc-ems-${suffix}`,
      displayName: "EMS Instructor",
    });
    const [site] = await db
      .insert(trainingSites)
      .values({ name: `EMS Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const [agency] = await db
      .insert(agencies)
      .values({ name: `EMS Agency ${suffix}` })
      .returning({ id: agencies.id });
    if (!site || !agency)
      throw new Error("EMS class fixture references failed.");
    const kbemsSystemId = await activeSystemId(db, "kbems");
    const [category] = await db
      .select({ id: trainingCodes.id, title: trainingCodes.title })
      .from(trainingCodes)
      .where(
        and(eq(trainingCodes.kind, "ems"), eq(trainingCodes.code, "Airway")),
      )
      .limit(1);
    if (!category) throw new Error("EMS category Airway is missing.");

    const created = await createOpenClass(db, instructor, {
      name: "EMS Airway Review",
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      deliveryMethod: "classroom",
      startsAt: "2026-09-10T09:00",
      creditedHours: 4,
      leadInstructorId: instructor.id,
      reportingSystemIds: [kbemsSystemId],
      accessPinEnabled: false,
      courseType: "refresher",
      objectives: "Airway review",
      emsCategoryId: category.id,
    });

    const detail = await getClassDetail(db, instructor, created.classRecord.id);
    expect(detail.emsCategoryId).toBe(category.id);
    expect(detail.emsCategory?.title).toBe(category.title);
  });
});
