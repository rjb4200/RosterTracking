import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AGENCY_TAG_CODES } from "../../src/modules/reference/constants";
import {
  createAgency,
  getAgency,
  listAgencies,
  updateAgency,
} from "../../src/modules/reference/services";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import { agencyTags, users } from "../../src/server/db/schema";
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
      username: `agency-tags-${suffix}`,
      displayName: "Agency Tags Actor",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  if (!user) throw new Error("Agency tags fixture actor failed.");
  return user;
}

async function tagId(db: Db, code: string): Promise<string> {
  const [tag] = await db
    .select({ id: agencyTags.id })
    .from(agencyTags)
    .where(eq(agencyTags.code, code))
    .limit(1);
  if (!tag) throw new Error(`Tag ${code} was not seeded.`);
  return tag.id;
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

describeDatabase("agency tags", () => {
  it("stores several tags and returns them from the read helpers", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const [fire, ems, volunteer] = await Promise.all([
      tagId(db, AGENCY_TAG_CODES.FIRE),
      tagId(db, AGENCY_TAG_CODES.EMS),
      tagId(db, AGENCY_TAG_CODES.VOLUNTEER),
    ]);
    const expected = [
      AGENCY_TAG_CODES.EMS,
      AGENCY_TAG_CODES.FIRE,
      AGENCY_TAG_CODES.VOLUNTEER,
    ].sort();
    const name = `Combined Agency ${crypto.randomUUID()}`;

    const created = await createAgency(db, actor, {
      name,
      tagIds: [fire, ems, volunteer],
    });

    const loaded = await getAgency(db, created.id);
    expect(loaded?.tags.map((tag) => tag.code).sort()).toEqual(expected);

    const listed = await listAgencies(db, name);
    const row = listed.find((agency) => agency.id === created.id);
    expect(row?.tags.map((tag) => tag.code).sort()).toEqual(expected);
  });

  it("replaces an agency's tags on update", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const fire = await tagId(db, AGENCY_TAG_CODES.FIRE);
    const ems = await tagId(db, AGENCY_TAG_CODES.EMS);
    const name = `Mutable Agency ${crypto.randomUUID()}`;

    const created = await createAgency(db, actor, { name, tagIds: [fire] });
    await updateAgency(db, actor, created.id, { name, tagIds: [ems] });

    const loaded = await getAgency(db, created.id);
    expect(loaded?.tags.map((tag) => tag.code)).toEqual([AGENCY_TAG_CODES.EMS]);
  });

  it("rejects a subtype without Other and stores it when Other is selected", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createActor(db);
    const fire = await tagId(db, AGENCY_TAG_CODES.FIRE);
    const other = await tagId(db, AGENCY_TAG_CODES.OTHER);

    await expect(
      createAgency(db, actor, {
        name: `Bad Subtype ${crypto.randomUUID()}`,
        tagIds: [fire],
        otherSubtype: "hospital",
      }),
    ).rejects.toThrow(/Other/i);

    const created = await createAgency(db, actor, {
      name: `Regional Hospital ${crypto.randomUUID()}`,
      tagIds: [other],
      otherSubtype: "hospital",
    });
    const loaded = await getAgency(db, created.id);
    expect(loaded?.tags).toHaveLength(1);
    expect(loaded?.tags[0]).toMatchObject({
      code: AGENCY_TAG_CODES.OTHER,
      subtype: "hospital",
    });
  });
});
