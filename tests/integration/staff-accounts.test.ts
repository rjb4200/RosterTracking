import { and, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import {
  createStaffAccount,
  listStaffAccounts,
  updateStaffAccount,
} from "../../src/modules/staff-auth/staff-accounts";
import * as schema from "../../src/server/db/schema";
import { auditLogs, roles, userRoles, users } from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

async function createUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  suffix: string,
  roleCode: string,
) {
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
  if (!user || !role) throw new Error("Account fixture creation failed.");
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

describeDatabase("staff account management", () => {
  it("restricts account listing and management to Administrators", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.INSTRUCTOR,
    );

    await expect(listStaffAccounts(db, instructor.id)).rejects.toThrow(
      /administrator access/i,
    );
    await expect(
      createStaffAccount(db, instructor.id, {
        username: `blocked-${crypto.randomUUID()}`,
        displayName: "Blocked",
        password: "A secure fixture password 1!",
        roleCode: ROLE_CODES.INSTRUCTOR,
      }),
    ).rejects.toThrow(/administrator access/i);
  });

  it("creates accounts, replaces roles, invalidates sessions, and writes safe audit records", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID();
    const administrator = await createUser(
      db,
      suffix,
      ROLE_CODES.ADMINISTRATOR,
    );
    const account = await createStaffAccount(db, administrator.id, {
      username: ` Staff-${suffix} `,
      displayName: "Staff Account",
      password: "A secure fixture password 1!",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });

    const accounts = await listStaffAccounts(db, administrator.id);
    expect(accounts.find(({ id }) => id === account.id)).toMatchObject({
      username: `staff-${suffix}`,
      roleCodes: [ROLE_CODES.INSTRUCTOR],
    });
    expect(JSON.stringify(accounts)).not.toContain("passwordHash");

    await updateStaffAccount(db, administrator.id, {
      userId: account.id,
      roleCode: ROLE_CODES.TRAINING_MAJOR,
    });
    await updateStaffAccount(db, administrator.id, {
      userId: account.id,
      password: "A replacement fixture password 2!",
    });
    await updateStaffAccount(db, administrator.id, {
      userId: account.id,
      isActive: false,
    });

    const [stored] = await db
      .select({
        isActive: users.isActive,
        sessionVersion: users.sessionVersion,
      })
      .from(users)
      .where(eq(users.id, account.id));
    const assignedRoles = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, account.id));
    const auditEvents = await db
      .select({ action: auditLogs.action, details: auditLogs.details })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityId, account.id),
          eq(auditLogs.entityType, "user"),
        ),
      );

    expect(stored).toEqual({ isActive: false, sessionVersion: 4 });
    expect(assignedRoles).toEqual([{ code: ROLE_CODES.TRAINING_MAJOR }]);
    expect(auditEvents.map(({ action }) => action)).toEqual([
      "staff.account.created",
      "staff.account.updated",
      "staff.account.updated",
      "staff.account.updated",
    ]);
    expect(JSON.stringify(auditEvents)).not.toContain("passwordHash");
    expect(JSON.stringify(auditEvents)).not.toContain(
      "A replacement fixture password 2!",
    );

    // Leave the following test with a single active Administrator fixture.
    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, administrator.id));
  });

  it("does not allow the final active Administrator to be changed or deactivated", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const administrator = await createUser(
      db,
      crypto.randomUUID(),
      ROLE_CODES.ADMINISTRATOR,
    );
    await db
      .update(users)
      .set({ isActive: false })
      .where(and(eq(users.isActive, true), ne(users.id, administrator.id)));

    await expect(
      updateStaffAccount(db, administrator.id, {
        userId: administrator.id,
        isActive: false,
      }),
    ).rejects.toThrow(/final active administrator/i);
    await expect(
      updateStaffAccount(db, administrator.id, {
        userId: administrator.id,
        roleCode: ROLE_CODES.INSTRUCTOR,
      }),
    ).rejects.toThrow(/final active administrator/i);
  });
});
