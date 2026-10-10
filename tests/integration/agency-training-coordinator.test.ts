import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAgency,
  getAgency,
  updateAgency,
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
      username: `agency-coordinator-${suffix}`,
      displayName: "Agency Coordinator Actor",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  if (!user) throw new Error("Agency coordinator fixture actor failed.");
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

describeDatabase("agency training coordinator", () => {
  it("stores a coordinator and normalizes the phone", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Coordinator Agency ${crypto.randomUUID()}`;

    const created = await createAgency(db, actor, {
      name,
      trainingCoordinatorName: "Dana Coordinator",
      trainingCoordinatorPhone: "(859) 555-1234",
      trainingCoordinatorEmail: "coordinator@example.com",
    });

    const loaded = await getAgency(db, created.id);
    expect(loaded).toMatchObject({
      trainingCoordinatorName: "Dana Coordinator",
      trainingCoordinatorPhone: "+18595551234",
      trainingCoordinatorEmail: "coordinator@example.com",
    });
  });

  it("updates the coordinator details", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Mutable Coordinator ${crypto.randomUUID()}`;

    const created = await createAgency(db, actor, {
      name,
      trainingCoordinatorName: "First Name",
      trainingCoordinatorPhone: "8595550000",
    });

    await updateAgency(db, actor, created.id, {
      name,
      trainingCoordinatorName: "Second Name",
      trainingCoordinatorPhone: "8595559999",
      trainingCoordinatorEmail: "second@example.com",
    });

    const loaded = await getAgency(db, created.id);
    expect(loaded).toMatchObject({
      trainingCoordinatorName: "Second Name",
      trainingCoordinatorPhone: "+18595559999",
      trainingCoordinatorEmail: "second@example.com",
    });
  });

  it("rejects an invalid coordinator phone number", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);

    await expect(
      createAgency(db, actor, {
        name: `Bad Phone ${crypto.randomUUID()}`,
        trainingCoordinatorPhone: "555-1234",
      }),
    ).rejects.toThrow(/10-digit US/i);
  });

  it("rejects an invalid coordinator email", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);

    await expect(
      createAgency(db, actor, {
        name: `Bad Email ${crypto.randomUUID()}`,
        trainingCoordinatorEmail: "not-an-email",
      }),
    ).rejects.toThrow();
  });

  it("accepts a coordinator name with blank phone and email", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Name Only Coordinator ${crypto.randomUUID()}`;

    const created = await createAgency(db, actor, {
      name,
      trainingCoordinatorName: "Only A Name",
    });

    const loaded = await getAgency(db, created.id);
    expect(loaded).toMatchObject({
      trainingCoordinatorName: "Only A Name",
      trainingCoordinatorPhone: null,
      trainingCoordinatorEmail: null,
    });
  });
});
