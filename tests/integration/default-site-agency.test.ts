import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  archiveAgency,
  archiveSite,
  createAgency,
  createSite,
  getDefaultAgency,
  getDefaultSite,
  setAgencyActive,
  setSiteActive,
  updateAgency,
  updateSite,
} from "../../src/modules/reference/services";
import type { Database } from "../../src/server/db/client";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  auditLogs,
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
      username: `default-actor-${suffix}`,
      displayName: "Default Actor",
      passwordHash: "not-a-real-hash",
    })
    .returning({ id: users.id, username: users.username });
  if (!actor) throw new Error("Default fixture actor failed.");
  return actor;
}

describeDatabase("default site and agency", () => {
  it("sets, replaces, and clears each default independently", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const suffix = crypto.randomUUID();
    const siteA = await createSite(db, actor, {
      name: `Default Site A ${suffix}`,
      isDefault: true,
    });
    const siteB = await createSite(db, actor, {
      name: `Default Site B ${suffix}`,
      isDefault: true,
    });
    expect((await getDefaultSite(db))?.id).toBe(siteB.id);

    const agencyA = await createAgency(db, actor, {
      name: `Default Agency A ${suffix}`,
      isDefault: true,
    });
    const agencyB = await createAgency(db, actor, {
      name: `Default Agency B ${suffix}`,
      isDefault: true,
    });
    expect((await getDefaultAgency(db))?.id).toBe(agencyB.id);
    expect((await getDefaultSite(db))?.id).toBe(siteB.id);

    await updateSite(db, actor, siteB.id, {
      name: siteB.name,
      isDefault: false,
    });
    expect(await getDefaultSite(db)).toBeNull();
    expect((await getDefaultAgency(db))?.id).toBe(agencyB.id);

    await updateAgency(db, actor, agencyB.id, {
      name: agencyB.name,
      isDefault: false,
    });
    expect(await getDefaultAgency(db)).toBeNull();
    const [storedSiteA] = await db
      .select({ isDefault: trainingSites.isDefault })
      .from(trainingSites)
      .where(eq(trainingSites.id, siteA.id));
    const [storedAgencyA] = await db
      .select({ isDefault: agencies.isDefault })
      .from(agencies)
      .where(eq(agencies.id, agencyA.id));
    expect(storedSiteA?.isDefault).toBe(false);
    expect(storedAgencyA?.isDefault).toBe(false);
  });

  it("blocks deactivation and archiving until the default is cleared", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const suffix = crypto.randomUUID();
    const site = await createSite(db, actor, {
      name: `Guarded Site ${suffix}`,
      isDefault: true,
    });
    const agency = await createAgency(db, actor, {
      name: `Guarded Agency ${suffix}`,
      isDefault: true,
    });

    await expect(setSiteActive(db, actor, site.id, false)).rejects.toThrow(
      /default training site/i,
    );
    await expect(archiveSite(db, actor, site.id)).rejects.toThrow(
      /default training site/i,
    );
    await expect(setAgencyActive(db, actor, agency.id, false)).rejects.toThrow(
      /default host agency/i,
    );
    await expect(archiveAgency(db, actor, agency.id)).rejects.toThrow(
      /default host agency/i,
    );

    await updateSite(db, actor, site.id, {
      name: site.name,
      isDefault: false,
    });
    await updateAgency(db, actor, agency.id, {
      name: agency.name,
      isDefault: false,
    });
    await expect(
      setSiteActive(db, actor, site.id, false),
    ).resolves.toBeDefined();
    await expect(archiveAgency(db, actor, agency.id)).resolves.toBeDefined();
  });

  it("refuses to make an inactive record the default", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const suffix = crypto.randomUUID();
    const site = await createSite(db, actor, {
      name: `Inactive Site ${suffix}`,
    });
    const agency = await createAgency(db, actor, {
      name: `Inactive Agency ${suffix}`,
    });
    await setSiteActive(db, actor, site.id, false);
    await setAgencyActive(db, actor, agency.id, false);

    await expect(
      updateSite(db, actor, site.id, { name: site.name, isDefault: true }),
    ).rejects.toThrow(/inactive site/i);
    await expect(
      updateAgency(db, actor, agency.id, {
        name: agency.name,
        isDefault: true,
      }),
    ).rejects.toThrow(/inactive agency/i);
  });

  it("audits the previous and new default", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const suffix = crypto.randomUUID();
    const first = await createSite(db, actor, {
      name: `Audit Site First ${suffix}`,
      isDefault: true,
    });
    const second = await createSite(db, actor, {
      name: `Audit Site Second ${suffix}`,
      isDefault: true,
    });
    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "site.default.changed"),
          eq(auditLogs.entityId, second.id),
        ),
      )
      .orderBy(desc(auditLogs.occurredAt))
      .limit(1);
    expect(entry?.details).toMatchObject({
      previousDefaultId: first.id,
      defaultSiteId: second.id,
    });
  });
});
