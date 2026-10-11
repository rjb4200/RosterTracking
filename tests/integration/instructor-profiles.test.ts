import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import {
  getStaffProfile,
  updateOwnProfile,
  updateStaffProfile,
} from "../../src/modules/staff-auth/profiles";
import * as schema from "../../src/server/db/schema";
import { auditLogs, roles, userRoles, users } from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";
import { uniqueFfn } from "./support/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function createUser(db: Db, suffix: string, roleCode: string) {
  const [user] = await db
    .insert(users)
    .values({
      username: `${roleCode}-${suffix}`,
      displayName: roleCode,
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode));
  if (!user || !role) throw new Error("Profile fixture creation failed.");
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

describeDatabase("instructor profiles", () => {
  it("lets an instructor edit their own profile and audits the change", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.INSTRUCTOR,
    );
    const ffn = uniqueFfn();

    await updateOwnProfile(db, instructor.id, {
      ffn,
      instructorLevel: "2",
      emsProviderNumber: "EMS-9001",
    });

    expect(await getStaffProfile(db, instructor.id)).toMatchObject({
      ffn,
      instructorLevel: 2,
      emsProviderNumber: "EMS-9001",
    });

    const events = await db
      .select({ action: auditLogs.action, details: auditLogs.details })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityId, instructor.id),
          eq(auditLogs.action, "staff.profile.updated"),
        ),
      );
    expect(events).toHaveLength(1);
    expect(events[0]?.details).toEqual({
      attributes: ["ffn", "instructorLevel", "emsProviderNumber"],
    });
    expect(JSON.stringify(events)).not.toContain("passwordHash");
  });

  it("ignores account fields submitted through the self-service path", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.INSTRUCTOR,
    );

    await updateOwnProfile(db, instructor.id, {
      ffn: uniqueFfn(),
      instructorLevel: "1",
      emsProviderNumber: "",
      // Extra keys are stripped: self-service can never change a role.
      roleCode: ROLE_CODES.ADMINISTRATOR,
      isActive: false,
    } as never);

    const assigned = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, instructor.id));
    const [account] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, instructor.id));
    expect(assigned).toEqual([{ code: ROLE_CODES.INSTRUCTOR }]);
    expect(account?.isActive).toBe(true);
  });

  it("prevents an instructor from editing another profile", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.INSTRUCTOR,
    );
    const target = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.INSTRUCTOR,
    );

    await expect(
      updateStaffProfile(db, instructor.id, target.id, {
        ffn: uniqueFfn(),
        instructorLevel: "1",
        emsProviderNumber: "",
      }),
    ).rejects.toThrow(/administrator access/i);
  });

  it("lets an administrator edit another staff member's profile", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const administrator = await createUser(
      db,
      suffix,
      ROLE_CODES.ADMINISTRATOR,
    );
    const target = await createUser(db, suffix, ROLE_CODES.INSTRUCTOR);
    const ffn = uniqueFfn();

    await updateStaffProfile(db, administrator.id, target.id, {
      ffn,
      instructorLevel: "3",
      emsProviderNumber: "",
    });

    expect(await getStaffProfile(db, target.id)).toMatchObject({
      ffn,
      instructorLevel: 3,
    });
  });

  it("rejects a duplicate FFN", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const first = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.INSTRUCTOR,
    );
    const second = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.INSTRUCTOR,
    );
    const ffn = uniqueFfn();

    await updateOwnProfile(db, first.id, {
      ffn,
      instructorLevel: "",
      emsProviderNumber: "",
    });
    await expect(
      updateOwnProfile(db, second.id, {
        ffn,
        instructorLevel: "",
        emsProviderNumber: "",
      }),
    ).rejects.toThrow(/already assigned/i);
  });

  it("rejects an invalid certification level", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.INSTRUCTOR,
    );

    await expect(
      updateOwnProfile(db, instructor.id, {
        ffn: "",
        instructorLevel: "4",
        emsProviderNumber: "",
      }),
    ).rejects.toThrow(/1, 2, or 3/);
  });
});
