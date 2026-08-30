import { hashPassword, normalizeUsername } from "../src/modules/staff-auth/password";
import { ROLE_CODES } from "../src/modules/staff-auth/permissions";
import { auditLogs, roles, userRoles, users } from "../src/server/db/schema";
import * as schema from "../src/server/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import type { DatabaseTransaction } from "../src/server/db/client";

const command = process.argv[2];
const directUrl = z.string().url().startsWith("postgresql://").parse(process.env.DATABASE_URL_DIRECT);
const username = normalizeUsername(process.env.ADMIN_USERNAME ?? "");
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

async function addAudit(
  transaction: DatabaseTransaction,
  action: string,
  entityId: string,
) {
  await transaction.insert(auditLogs).values({
    actorType: "system",
    action,
    entityType: "user",
    entityId,
    details: { username, source: "admin-command" },
  });
}

async function requireUserId(): Promise<string> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (!user) {
    throw new Error(`Staff user '${username}' does not exist.`);
  }
  return user.id;
}

async function bootstrap() {
  const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD ?? "");
  const displayName = z.string().trim().min(1).max(100).parse(process.env.ADMIN_DISPLAY_NAME ?? username);

  await db.transaction(async (transaction) => {
    const [administratorRole] = await transaction
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.code, ROLE_CODES.ADMINISTRATOR), eq(roles.isActive, true)))
      .limit(1);
    if (!administratorRole) {
      throw new Error("Administrator role is missing. Run npm run db:seed first.");
    }

    const [user] = await transaction
      .insert(users)
      .values({ username, displayName, passwordHash })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          displayName,
          passwordHash,
          isActive: true,
          failedLoginCount: 0,
          lockedUntil: null,
          sessionVersion: sql`${users.sessionVersion} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id });
    if (!user) throw new Error("Administrator account was not created.");

    await transaction
      .insert(userRoles)
      .values({ userId: user.id, roleId: administratorRole.id })
      .onConflictDoNothing();
    await addAudit(transaction, "staff.account.bootstrapped", user.id);
  });
}

async function resetPassword() {
  const userId = await requireUserId();
  const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD ?? "");
  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    await addAudit(transaction, "staff.password.reset", userId);
  });
}

async function setAccountState(isActive: boolean) {
  const userId = await requireUserId();
  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({
        isActive,
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    await addAudit(transaction, isActive ? "staff.account.enabled" : "staff.account.disabled", userId);
  });
}

async function unlock() {
  const userId = await requireUserId();
  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await addAudit(transaction, "staff.account.unlocked", userId);
  });
}

try {
  switch (command) {
    case "bootstrap": await bootstrap(); break;
    case "reset-password": await resetPassword(); break;
    case "unlock": await unlock(); break;
    case "disable": await setAccountState(false); break;
    case "enable": await setAccountState(true); break;
    default: throw new Error("Use: npm run admin -- bootstrap|reset-password|unlock|disable|enable");
  }
  console.log(`Administrative command '${command}' completed for '${username}'.`);
} finally {
  await pool.end();
}
