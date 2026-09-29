import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getClassAuditLog } from "../../src/modules/class-audit-log/service";
import { hashClassSignInToken } from "../../src/modules/classes/token";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  auditLogs,
  classInstructors,
  finalizationRevisions,
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
  if (pool) {
    await migrate(drizzle(pool, { schema }), { migrationsFolder: "drizzle" });
  }
});

afterAll(async () => {
  await pool?.end();
});

async function createFixture() {
  if (!pool) throw new Error("TEST_DATABASE_URL is required.");
  const db = drizzle(pool, { schema });
  const suffix = crypto.randomUUID();
  const [actor] = await db
    .insert(users)
    .values({
      username: `audit-${suffix}`,
      displayName: "Audit Instructor",
      passwordHash: "not-a-real-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [outsider] = await db
    .insert(users)
    .values({
      username: `outsider-${suffix}`,
      displayName: "Unrelated Instructor",
      passwordHash: "not-a-real-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Audit Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Audit Site ${suffix}` })
    .returning({ id: trainingSites.id });
  if (!actor || !outsider || !agency || !site) {
    throw new Error("Audit fixtures were not created.");
  }
  const createClass = async (label: string) => {
    const [created] = await db
      .insert(trainingClasses)
      .values({
        name: `Audit Course ${label} ${suffix}`,
        trainingSiteId: site.id,
        hostAgencyId: agency.id,
        createdByUserId: actor.id,
        deliveryMethod: "classroom",
        status: "open",
        signInTokenHash: hashClassSignInToken(crypto.randomUUID()),
        openedAt: new Date(),
      })
      .returning({ id: trainingClasses.id });
    if (!created) throw new Error("Audit class was not created.");
    return created.id;
  };
  const classId = await createClass("primary");
  const otherClassId = await createClass("other");
  await db.insert(classInstructors).values({
    classId,
    userId: actor.id,
    isLead: true,
  });
  const createRevision = async (targetClassId: string) => {
    const [created] = await db
      .insert(finalizationRevisions)
      .values({
        classId: targetClassId,
        revisionNumber: 1,
        finalizedByUserId: actor.id,
        encryptedSnapshot: "encrypted",
        summary: {},
      })
      .returning({ id: finalizationRevisions.id });
    if (!created) throw new Error("Audit revision was not created.");
    return created.id;
  };
  const revisionId = await createRevision(classId);
  const otherRevisionId = await createRevision(otherClassId);
  return {
    db,
    actor,
    outsider,
    classId,
    otherClassId,
    revisionId,
    otherRevisionId,
  };
}

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function writeEvents(
  fixture: Fixture,
  target: { classId: string; revisionId: string },
) {
  const base = {
    actorUserId: fixture.actor.id,
    actorType: "user" as const,
    ipAddress: null,
  };
  await fixture.db.insert(auditLogs).values([
    {
      ...base,
      action: "class.created",
      entityType: "class",
      entityId: target.classId,
      details: { name: "Audit Course primary" },
    },
    {
      ...base,
      action: "attendance.public_sign_in",
      entityType: "attendance",
      entityId: crypto.randomUUID(),
      details: { classId: target.classId },
    },
    {
      action: "student.created_from_sign_in",
      actorType: "system",
      entityType: "student",
      entityId: crypto.randomUUID(),
      details: { classId: target.classId },
    },
    {
      ...base,
      action: "official_roster.generated",
      entityType: "finalization_revision",
      entityId: target.revisionId,
      details: { formType: "kfs-1a" },
    },
  ]);
}

describeDatabase("class audit log", () => {
  it("includes class, attendance, sign-in, and revision-output events and excludes other classes", async () => {
    const fixture = await createFixture();
    await writeEvents(fixture, {
      classId: fixture.classId,
      revisionId: fixture.revisionId,
    });
    await writeEvents(fixture, {
      classId: fixture.otherClassId,
      revisionId: fixture.otherRevisionId,
    });

    const log = await getClassAuditLog(
      fixture.db,
      fixture.actor,
      fixture.classId,
    );
    const actions = log.entries.map((entry) => entry.action);
    // All fixture rows share one timestamp, so compare as an unordered set.
    expect([...actions].sort()).toEqual(
      [
        "class.created",
        "attendance.public_sign_in",
        "student.created_from_sign_in",
        "official_roster.generated",
      ].sort(),
    );
    expect(log.entries).toHaveLength(4);
    const rosterEntry = log.entries.find(
      (entry) => entry.action === "official_roster.generated",
    );
    expect(rosterEntry?.revisionNumber).toBe(1);
    const classEntry = log.entries.find(
      (entry) => entry.action === "class.created",
    );
    expect(classEntry?.actorName).toBe("Audit Instructor");
    expect(log.className).toContain("Audit Course primary");
  });

  it("denies an unrelated instructor", async () => {
    const fixture = await createFixture();
    await expect(
      getClassAuditLog(fixture.db, fixture.outsider, fixture.classId),
    ).rejects.toThrow();
  });
});
