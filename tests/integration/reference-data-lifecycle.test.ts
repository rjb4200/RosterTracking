import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  archiveAgency,
  archiveTrainingCode,
  createAgency,
  importTrainingCodes,
  listAgencies,
  listTrainingCodes,
  setAgencyActive,
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
      username: `lifecycle-${suffix}`,
      displayName: "Lifecycle Actor",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  if (!user) throw new Error("Lifecycle fixture actor failed.");
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

describeDatabase("reference data lifecycle", () => {
  it("deactivates, reactivates, and archives an agency, hiding archived from the list", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Lifecycle Agency ${crypto.randomUUID()}`;
    const agency = await createAgency(db, actor, { name });
    expect(agency.isActive).toBe(true);

    await setAgencyActive(db, actor, agency.id, false);
    const listed = await listAgencies(db, name);
    expect(listed.find((row) => row.id === agency.id)?.isActive).toBe(false);

    await archiveAgency(db, actor, agency.id);
    const afterArchive = await listAgencies(db, name);
    expect(afterArchive.map((row) => row.id)).not.toContain(agency.id);
  });

  it("revives an archived agency and reactivates an inactive agency when re-added", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const name = `Readd Agency ${crypto.randomUUID()}`;
    const agency = await createAgency(db, actor, { name });

    await archiveAgency(db, actor, agency.id);
    const revived = await createAgency(db, actor, { name });
    expect(revived.id).toBe(agency.id);
    expect(revived.isActive).toBe(true);
    expect(revived.archivedAt).toBeNull();

    await setAgencyActive(db, actor, agency.id, false);
    const reactivated = await createAgency(db, actor, { name });
    expect(reactivated.id).toBe(agency.id);
    expect(reactivated.isActive).toBe(true);
  });

  it("archives dropped training codes on import and revives them on re-import", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const revision = `rev-${crypto.randomUUID().slice(0, 8)}`;
    const alpha = {
      code: `A-${revision}`,
      title: "Alpha",
      sourceRevision: revision,
    };
    const bravo = {
      code: `B-${revision}`,
      title: "Bravo",
      sourceRevision: revision,
    };

    await importTrainingCodes(db, actor, [alpha, bravo]);
    expect(
      (await listTrainingCodes(db, revision)).map((c) => c.code).sort(),
    ).toEqual([alpha.code, bravo.code].sort());

    // Re-importing a shorter list retires the dropped code.
    await importTrainingCodes(db, actor, [alpha]);
    expect((await listTrainingCodes(db, revision)).map((c) => c.code)).toEqual([
      alpha.code,
    ]);

    // Re-importing the full list revives it.
    await importTrainingCodes(db, actor, [alpha, bravo]);
    expect(
      (await listTrainingCodes(db, revision)).map((c) => c.code).sort(),
    ).toEqual([alpha.code, bravo.code].sort());
  });

  it("archives a training code and hides it from the management list", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const revision = `rev-${crypto.randomUUID().slice(0, 8)}`;
    const code = {
      code: `C-${revision}`,
      title: "Charlie",
      sourceRevision: revision,
    };
    await importTrainingCodes(db, actor, [code]);
    const [stored] = await listTrainingCodes(db, code.code);
    if (!stored) throw new Error("Training code was not stored.");
    await archiveTrainingCode(db, actor, stored.id);
    expect(await listTrainingCodes(db, code.code)).toHaveLength(0);
  });
});
