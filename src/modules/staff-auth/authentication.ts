import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import { getDatabase } from "@/server/db/client";
import { writeAuditLog } from "@/server/db/audit";
import { users } from "@/server/db/schema";

import { normalizeUsername, verifyPassword } from "./password";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$gdOqa5USRU28KTTAbX0d7A$/zZ3x/GllXRR/ku8I6UqKTXICvc1jqTZIhKODHmNlLY";

export interface AuthenticatedStaff {
  id: string;
  username: string;
  displayName: string;
  sessionVersion: number;
}

export async function authenticateStaff(
  submittedUsername: string,
  submittedPassword: string,
  ipAddress?: string,
): Promise<AuthenticatedStaff | null> {
  let username: string;

  try {
    username = normalizeUsername(submittedUsername);
  } catch {
    await verifyPassword(DUMMY_PASSWORD_HASH, submittedPassword);
    return null;
  }

  const db = getDatabase();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user) {
    await verifyPassword(DUMMY_PASSWORD_HASH, submittedPassword);
    return null;
  }

  const passwordMatches = await verifyPassword(user.passwordHash, submittedPassword);
  const now = new Date();

  if (!user.isActive || (user.lockedUntil && user.lockedUntil > now) || !passwordMatches) {
    if (user.isActive && (!user.lockedUntil || user.lockedUntil <= now) && !passwordMatches) {
      await db
        .update(users)
        .set({
          failedLoginCount: sql`${users.failedLoginCount} + 1`,
          lockedUntil: sql`case
            when ${users.failedLoginCount} + 1 >= ${MAX_FAILED_ATTEMPTS}
            then ${new Date(now.getTime() + LOCK_DURATION_MS)}
            else null
          end`,
          updatedAt: now,
        })
        .where(
          and(
            eq(users.id, user.id),
            eq(users.isActive, true),
            or(isNull(users.lockedUntil), lte(users.lockedUntil, now)),
          ),
        );
    }

    return null;
  }

  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: now, updatedAt: now })
      .where(eq(users.id, user.id));
    await writeAuditLog(transaction, {
      actorUserId: user.id,
      actorType: "user",
      action: "staff.login.succeeded",
      entityType: "user",
      entityId: user.id,
      ipAddress,
      details: { username: user.username },
    });
  });

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    sessionVersion: user.sessionVersion,
  };
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await getDatabase()
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
