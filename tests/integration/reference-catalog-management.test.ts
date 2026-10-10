import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCurriculum,
  createTrainingCode,
  getCurriculum,
  getTrainingCode,
} from "../../src/modules/reference/services";
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
      username: `catalog-${suffix}`,
      displayName: "Catalog Actor",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  if (!user) throw new Error("Catalog fixture actor failed.");
  return user;
}

beforeAll(async () => {
  if (!pool) return;
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.transaction(seedFoundation);
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("reference catalog management lookups", () => {
  it("loads a training code by id and returns null when missing", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const revision = `rev-${crypto.randomUUID().slice(0, 8)}`;
    const created = await createTrainingCode(db, actor, {
      code: `TC-${revision}`,
      title: "Lookup Code",
    });
    expect(created.sourceRevision).toBe("manual");

    const loaded = await getTrainingCode(db, created.id);
    expect(loaded?.code).toBe(`TC-${revision}`);
    expect(await getTrainingCode(db, crypto.randomUUID())).toBeNull();
  });

  it("loads a curriculum by id and returns null when missing", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const revision = `rev-${crypto.randomUUID().slice(0, 8)}`;
    const created = await createCurriculum(db, actor, {
      publisher: "Lookup Publisher",
      programTitle: `Lookup Program ${revision}`,
    });
    expect(created.sourceRevision).toBe("manual");

    const loaded = await getCurriculum(db, created.id);
    expect(loaded?.programTitle).toBe(`Lookup Program ${revision}`);
    expect(await getCurriculum(db, crypto.randomUUID())).toBeNull();
  });
});
