import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCurriculum,
  createTrainingCode,
  updateCurriculum,
  updateTrainingCode,
} from "../../src/modules/reference/services";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import {
  archiveStaffAccount,
  createStaffAccount,
  listStaffAccounts,
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

async function createUser(db: Db, roleCode: string) {
  const suffix = crypto.randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      username: `${roleCode}-${suffix}`,
      displayName: roleCode,
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode));
  if (!user || !role) throw new Error("Fixture user failed.");
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

describeDatabase("reference editing and account archive", () => {
  it("archives a staff account, hides it, refuses self-archive, and revives on re-create", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const admin = await createUser(db, ROLE_CODES.ADMINISTRATOR);
    const username = `archived-${crypto.randomUUID()}`;
    const created = await createStaffAccount(db, admin.id, {
      username,
      displayName: "Archived Instructor",
      password: "A secure fixture password 1!",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });

    expect((await listStaffAccounts(db, admin.id)).map((a) => a.id)).toContain(
      created.id,
    );

    await archiveStaffAccount(db, admin.id, created.id);
    expect(
      (await listStaffAccounts(db, admin.id)).map((a) => a.id),
    ).not.toContain(created.id);
    const [archived] = await db
      .select({ isActive: users.isActive, archivedAt: users.archivedAt })
      .from(users)
      .where(eq(users.id, created.id));
    expect(archived?.isActive).toBe(false);
    expect(archived?.archivedAt).not.toBeNull();

    await expect(archiveStaffAccount(db, admin.id, admin.id)).rejects.toThrow(
      /own account/i,
    );

    const revived = await createStaffAccount(db, admin.id, {
      username,
      displayName: "Revived Instructor",
      password: "A secure fixture password 1!",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });
    expect(revived.id).toBe(created.id);
    expect((await listStaffAccounts(db, admin.id)).map((a) => a.id)).toContain(
      created.id,
    );
  });

  it("creates and edits training codes and rejects duplicates", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createUser(db, ROLE_CODES.INSTRUCTOR);
    const revision = `rev-${crypto.randomUUID().slice(0, 8)}`;
    const created = await createTrainingCode(db, actor, {
      code: `E-${revision}`,
      title: "Echo",
      sourceRevision: revision,
    });
    const updated = await updateTrainingCode(db, actor, created.id, {
      code: created.code,
      title: "Echo Updated",
      sourceRevision: revision,
    });
    expect(updated.title).toBe("Echo Updated");

    await expect(
      createTrainingCode(db, actor, {
        code: created.code,
        title: "Duplicate",
        sourceRevision: revision,
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it("creates and edits curricula and rejects duplicates", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const actor = await createUser(db, ROLE_CODES.INSTRUCTOR);
    const revision = `rev-${crypto.randomUUID().slice(0, 8)}`;
    const created = await createCurriculum(db, actor, {
      publisher: "IFSTA",
      programTitle: `Echo Program ${revision}`,
      version: "1st Edition",
      sourceRevision: revision,
    });
    const updated = await updateCurriculum(db, actor, created.id, {
      publisher: created.publisher,
      programTitle: created.programTitle,
      version: "2nd Edition",
      sourceRevision: revision,
    });
    expect(updated.version).toBe("2nd Edition");

    await expect(
      createCurriculum(db, actor, {
        publisher: created.publisher,
        programTitle: created.programTitle,
        version: "",
        sourceRevision: revision,
      }),
    ).rejects.toThrow(/already exists/i);
  });
});
