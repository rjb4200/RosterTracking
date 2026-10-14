import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  archiveAgency,
  archiveSite,
  createAgency,
  createSite,
  listSites,
} from "../../src/modules/reference/services";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import { users } from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function createActor(db: Db) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const [user] = await db
    .insert(users)
    .values({
      username: `inline-${suffix}`,
      displayName: "Inline Creation Actor",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  if (!user) throw new Error("Inline-creation fixture actor failed.");
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

describeDatabase("inline site and agency creation", () => {
  it("creates a site with details and reuses the active site on a name match", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Inline Site ${crypto.randomUUID()}`;

    const created = await createSite(db, actor, {
      name,
      address: "1 Main St",
      city: "Winchester",
      state: "KY",
      zip: "40391",
    });
    expect(created.isActive).toBe(true);
    expect(created.address).toBe("1 Main St");

    const reused = await createSite(db, actor, { name: `  ${name}  ` });
    expect(reused.id).toBe(created.id);
    expect(reused.address).toBe("1 Main St");

    const listed = await listSites(db, name);
    expect(listed.filter((site) => site.isActive)).toHaveLength(1);
  });

  it("revives an archived site when re-added", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Revive Site ${crypto.randomUUID()}`;

    const site = await createSite(db, actor, { name });
    await archiveSite(db, actor, site.id);
    const revived = await createSite(db, actor, { name });
    expect(revived.id).toBe(site.id);
    expect(revived.isActive).toBe(true);
    expect(revived.archivedAt).toBeNull();
  });

  it("reuses the active agency on a name match", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Inline Agency ${crypto.randomUUID()}`;

    const created = await createAgency(db, actor, { name });
    const reused = await createAgency(db, actor, { name: name.toUpperCase() });
    expect(reused.id).toBe(created.id);
  });

  it("revives an archived agency when re-added", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Revive Agency ${crypto.randomUUID()}`;

    const agency = await createAgency(db, actor, { name });
    await archiveAgency(db, actor, agency.id);
    const revived = await createAgency(db, actor, { name });
    expect(revived.id).toBe(agency.id);
    expect(revived.isActive).toBe(true);
    expect(revived.archivedAt).toBeNull();
  });
});
