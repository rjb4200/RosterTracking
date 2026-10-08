import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import {
  createStaffAccount,
  getStaffAccount,
  listStaffAccounts,
  updateStaffAccount,
} from "../../src/modules/staff-auth/staff-accounts";
import * as schema from "../../src/server/db/schema";
import { roles, userRoles, users } from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function createAdmin(db: Db) {
  const suffix = crypto.randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      username: `admin-${suffix}`,
      displayName: "Admin",
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, ROLE_CODES.ADMINISTRATOR));
  if (!user || !role) throw new Error("Admin fixture failed.");
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
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

describeDatabase("staff account pages", () => {
  it("searches accounts and reports a missing last login", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const admin = await createAdmin(db);
    const suffix = crypto.randomUUID();
    await createStaffAccount(db, admin.id, {
      username: `alpha-${suffix}`,
      displayName: "Alpha Person",
      password: "A secure fixture password 1!",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });
    await createStaffAccount(db, admin.id, {
      username: `bravo-${suffix}`,
      displayName: "Bravo Person",
      password: "A secure fixture password 1!",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });

    const searched = await listStaffAccounts(db, admin.id, `alpha-${suffix}`);
    expect(searched).toHaveLength(1);
    expect(searched[0]?.username).toBe(`alpha-${suffix}`);
    expect(searched[0]?.lastLoginAt).toBeNull();
  });

  it("fetches one account and edits its display name", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const admin = await createAdmin(db);
    const suffix = crypto.randomUUID();
    const created = await createStaffAccount(db, admin.id, {
      username: `charlie-${suffix}`,
      displayName: "Charlie",
      password: "A secure fixture password 1!",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });

    expect((await getStaffAccount(db, admin.id, created.id))?.displayName).toBe(
      "Charlie",
    );
    await updateStaffAccount(db, admin.id, {
      userId: created.id,
      displayName: "Charles",
      isActive: true,
    });
    expect((await getStaffAccount(db, admin.id, created.id))?.displayName).toBe(
      "Charles",
    );
    expect(await getStaffAccount(db, admin.id, crypto.randomUUID())).toBeNull();
  });
});
