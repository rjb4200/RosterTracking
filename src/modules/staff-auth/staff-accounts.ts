import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import { roles, userRoles, users } from "@/server/db/schema";

import { hashPassword, normalizeUsername, validatePassword } from "./password";
import { ROLE_CODES } from "./permissions";

const roleSchema = z.enum([
  ROLE_CODES.INSTRUCTOR,
  ROLE_CODES.TRAINING_MAJOR,
  ROLE_CODES.ADMINISTRATOR,
]);

const accountInput = z.object({
  username: z.string(),
  displayName: z.string().trim().min(1).max(100),
  password: z.string(),
  roleCode: roleSchema,
});

async function requireAdministrator(
  transaction: DatabaseTransaction,
  actorId: string,
) {
  const [row] = await transaction
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(
      roles,
      and(
        eq(roles.id, userRoles.roleId),
        eq(roles.code, ROLE_CODES.ADMINISTRATOR),
        eq(roles.isActive, true),
      ),
    )
    .where(and(eq(users.id, actorId), eq(users.isActive, true)))
    .limit(1);
  if (!row) throw new Error("Administrator access is required.");
}

async function requireRole(
  transaction: DatabaseTransaction,
  roleCode: z.infer<typeof roleSchema>,
) {
  const [role] = await transaction
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.code, roleCode), eq(roles.isActive, true)))
    .limit(1);
  if (!role) throw new Error("Selected staff role is unavailable.");
  return role;
}

async function ensureNotFinalAdministrator(
  transaction: DatabaseTransaction,
  userId: string,
) {
  const [target] = await transaction
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(
      roles,
      and(
        eq(roles.id, userRoles.roleId),
        eq(roles.code, ROLE_CODES.ADMINISTRATOR),
      ),
    )
    .where(eq(users.id, userId))
    .limit(1);
  if (!target?.isActive) return;
  const [count] = await transaction
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(
      roles,
      and(
        eq(roles.id, userRoles.roleId),
        eq(roles.code, ROLE_CODES.ADMINISTRATOR),
        eq(roles.isActive, true),
      ),
    )
    .where(eq(users.isActive, true));
  if (Number(count?.count ?? 0) <= 1) {
    throw new Error(
      "The final active Administrator cannot be changed or deactivated.",
    );
  }
}

export async function listStaffAccounts(db: Database, actorId: string) {
  return db.transaction(async (transaction) => {
    await requireAdministrator(transaction, actorId);
    const rows = await transaction
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        isActive: users.isActive,
        roleCode: roles.code,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId));
    return Object.values(
      rows.reduce<
        Record<string, (typeof rows)[number] & { roleCodes: string[] }>
      >((accounts, row) => {
        let account = accounts[row.id];
        if (!account) {
          account = { ...row, roleCodes: [] };
          accounts[row.id] = account;
        }
        if (row.roleCode) account.roleCodes.push(row.roleCode);
        return accounts;
      }, {}),
    );
  });
}

export async function createStaffAccount(
  db: Database,
  actorId: string,
  input: z.input<typeof accountInput>,
) {
  const parsed = accountInput.parse(input);
  const username = normalizeUsername(parsed.username);
  const passwordHash = await hashPassword(validatePassword(parsed.password));
  return db.transaction(async (transaction) => {
    await requireAdministrator(transaction, actorId);
    const role = await requireRole(transaction, parsed.roleCode);
    const [account] = await transaction
      .insert(users)
      .values({ username, displayName: parsed.displayName, passwordHash })
      .returning({ id: users.id });
    if (!account) throw new Error("Staff account was not created.");
    await transaction.insert(userRoles).values({
      userId: account.id,
      roleId: role.id,
      assignedByUserId: actorId,
    });
    await writeAuditLog(transaction, {
      actorUserId: actorId,
      actorType: "user",
      action: "staff.account.created",
      entityType: "user",
      entityId: account.id,
      details: { username, roleCode: parsed.roleCode },
    });
    return account;
  });
}

export async function updateStaffAccount(
  db: Database,
  actorId: string,
  input: {
    userId: string;
    roleCode?: string;
    isActive?: boolean;
    password?: string;
  },
) {
  const parsed = z
    .object({
      userId: z.string().uuid(),
      roleCode: roleSchema.optional(),
      isActive: z.boolean().optional(),
      password: z.string().optional(),
    })
    .parse(input);
  const passwordHash = parsed.password
    ? await hashPassword(validatePassword(parsed.password))
    : undefined;
  return db.transaction(async (transaction) => {
    await requireAdministrator(transaction, actorId);
    if (
      parsed.isActive === false ||
      (parsed.roleCode && parsed.roleCode !== ROLE_CODES.ADMINISTRATOR)
    ) {
      await ensureNotFinalAdministrator(transaction, parsed.userId);
    }
    if (parsed.roleCode) {
      const role = await requireRole(transaction, parsed.roleCode);
      await transaction
        .delete(userRoles)
        .where(eq(userRoles.userId, parsed.userId));
      await transaction.insert(userRoles).values({
        userId: parsed.userId,
        roleId: role.id,
        assignedByUserId: actorId,
      });
    }
    if (parsed.isActive !== undefined || passwordHash || parsed.roleCode) {
      await transaction
        .update(users)
        .set({
          ...(parsed.isActive === undefined
            ? {}
            : { isActive: parsed.isActive }),
          ...(passwordHash ? { passwordHash } : {}),
          sessionVersion: sql`${users.sessionVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, parsed.userId));
    }
    await writeAuditLog(transaction, {
      actorUserId: actorId,
      actorType: "user",
      action: "staff.account.updated",
      entityType: "user",
      entityId: parsed.userId,
      details: {
        roleCode: parsed.roleCode,
        isActive: parsed.isActive,
        passwordReset: Boolean(passwordHash),
      },
    });
  });
}
