import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateReportingDestination } from "../../src/modules/classes/finalization";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
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

describeDatabase("retained finalization destination statuses", () => {
  it("retains independent destination writes, authorization, and audit history for future exports", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    async function createUser(roleCode: string) {
      const [user] = await db
        .insert(schema.users)
        .values({
          username: `${roleCode}-${suffix}`,
          displayName: roleCode,
          passwordHash: "fixture",
        })
        .returning();
      const [role] = await db
        .select()
        .from(schema.roles)
        .where(eq(schema.roles.code, roleCode));
      if (!user || !role) throw new Error("Destination fixture user failed.");
      await db
        .insert(schema.userRoles)
        .values({ userId: user.id, roleId: role.id });
      return user;
    }
    const reporter = await createUser(ROLE_CODES.TRAINING_MAJOR);
    const instructor = await createUser(ROLE_CODES.INSTRUCTOR);
    const [agency] = await db
      .insert(schema.agencies)
      .values({ name: `Retained status agency ${suffix}` })
      .returning();
    if (!agency) throw new Error("Destination fixture agency failed.");
    const [classRecord] = await db
      .insert(schema.trainingClasses)
      .values({
        name: `Retained status ${suffix}`,
        hostAgencyId: agency.id,
        createdByUserId: instructor.id,
        deliveryMethod: "online",
        status: "finalized",
        signInTokenHash: suffix,
      })
      .returning();
    if (!classRecord) throw new Error("Destination fixture class failed.");
    const [revision] = await db
      .insert(schema.finalizationRevisions)
      .values({
        classId: classRecord.id,
        revisionNumber: 1,
        finalizedByUserId: instructor.id,
        encryptedSnapshot: "fixture",
        summary: {},
      })
      .returning();
    const systems = await db.select().from(schema.reportingSystems);
    const fire = systems.find((system) => system.code === "fire");
    const kbems = systems.find((system) => system.code === "kbems");
    if (!revision || !fire || !kbems)
      throw new Error("Destination fixture references failed.");
    await db.insert(schema.finalizationReportingStatuses).values([
      { revisionId: revision.id, reportingSystemId: fire.id },
      { revisionId: revision.id, reportingSystemId: kbems.id },
    ]);
    const input = {
      revisionId: revision.id,
      reportingSystemId: fire.id,
      status: "entered",
      referenceNumber: " FIRE-42 ",
    };
    await expect(
      updateReportingDestination(db, instructor, input),
    ).rejects.toThrow(/Training Major or Administrator/i);
    await updateReportingDestination(db, reporter, input);
    const statuses = await db
      .select()
      .from(schema.finalizationReportingStatuses)
      .where(eq(schema.finalizationReportingStatuses.revisionId, revision.id));
    expect(
      statuses.find((status) => status.reportingSystemId === fire.id),
    ).toMatchObject({
      status: "entered",
      referenceNumber: "FIRE-42",
      reportedByUserId: reporter.id,
    });
    expect(
      statuses.find((status) => status.reportingSystemId === kbems.id),
    ).toMatchObject({ status: "pending" });
    await updateReportingDestination(db, reporter, {
      revisionId: revision.id,
      reportingSystemId: kbems.id,
      status: "not_required",
    });
    const audit = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.entityId, revision.id),
          eq(schema.auditLogs.action, "reporting.destination.updated"),
        ),
      );
    expect(audit).toHaveLength(2);
  });
});
