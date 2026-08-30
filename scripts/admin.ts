import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import {
  hashPassword,
  normalizeUsername,
} from "../src/modules/staff-auth/password";
import { ROLE_CODES } from "../src/modules/staff-auth/permissions";
import type { DatabaseTransaction } from "../src/server/db/client";
import * as schema from "../src/server/db/schema";
import { auditLogs, roles, userRoles, users } from "../src/server/db/schema";

const command = process.argv[2];
const roleArgument = process.argv[3];

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

function readUsername(): string {
  return normalizeUsername(process.env.ADMIN_USERNAME ?? "");
}

function readPasswordHash(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (password.length === 0) {
    throw new Error("ADMIN_PASSWORD is required.");
  }
  return hashPassword(password);
}

function readDisplayName(username: string): string {
  return z
    .string()
    .trim()
    .min(1)
    .max(100)
    .parse(process.env.ADMIN_DISPLAY_NAME ?? username);
}

function parseRoleCode(input: string | undefined): string {
  const valid = Object.values(ROLE_CODES) as string[];
  if (!input || !valid.includes(input)) {
    throw new Error(`Role must be one of: ${valid.join(", ")}.`);
  }
  return input;
}

async function addAudit(
  transaction: DatabaseTransaction,
  action: string,
  entityId: string,
  username: string,
) {
  await transaction.insert(auditLogs).values({
    actorType: "system",
    action,
    entityType: "user",
    entityId,
    details: { username, source: "admin-command" },
  });
}

async function requireUserId(username: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!user) {
    throw new Error(`Staff user '${username}' does not exist.`);
  }
  return user.id;
}

async function createStaff(roleCode: string) {
  const username = readUsername();
  const passwordHash = await readPasswordHash();
  const displayName = readDisplayName(username);

  await db.transaction(async (transaction) => {
    const [role] = await transaction
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.code, roleCode), eq(roles.isActive, true)))
      .limit(1);
    if (!role) {
      throw new Error(
        `Role '${roleCode}' is missing or inactive. Run npm run db:seed first.`,
      );
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
    if (!user) throw new Error("Staff account was not created.");

    await transaction
      .insert(userRoles)
      .values({ userId: user.id, roleId: role.id })
      .onConflictDoNothing();
    await addAudit(transaction, "staff.account.created", user.id, username);
  });
}

async function bootstrap() {
  await createStaff(ROLE_CODES.ADMINISTRATOR);
}

async function resetPassword() {
  const username = readUsername();
  const userId = await requireUserId(username);
  const passwordHash = await readPasswordHash();
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
    await addAudit(transaction, "staff.password.reset", userId, username);
  });
}

async function setAccountState(isActive: boolean) {
  const username = readUsername();
  const userId = await requireUserId(username);
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
    await addAudit(
      transaction,
      isActive ? "staff.account.enabled" : "staff.account.disabled",
      userId,
      username,
    );
  });
}

async function unlock() {
  const username = readUsername();
  const userId = await requireUserId(username);
  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await addAudit(transaction, "staff.account.unlocked", userId, username);
  });
}

try {
  switch (command) {
    case "bootstrap":
      await bootstrap();
      break;
    case "create":
      await createStaff(parseRoleCode(roleArgument));
      break;
    case "reset-password":
      await resetPassword();
      break;
    case "unlock":
      await unlock();
      break;
    case "disable":
      await setAccountState(false);
      break;
    case "enable":
      await setAccountState(true);
      break;
    default:
      throw new Error(
        "Use: npm run admin -- bootstrap | create <role> | reset-password | unlock | disable | enable",
      );
  }
  console.log(`Administrative command '${command}' completed.`);
} finally {
  await pool.end();
}
