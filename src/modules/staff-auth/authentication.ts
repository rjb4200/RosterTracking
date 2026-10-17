import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { writeAuditLog } from "@/server/db/audit";
import type { Database } from "@/server/db/client";
import { getDatabase } from "@/server/db/client";
import { users } from "@/server/db/schema";

import { normalizeEmail } from "./email";
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
  submittedIdentifier: string,
  submittedPassword: string,
  ipAddress?: string,
  database?: Database,
): Promise<AuthenticatedStaff | null> {
  // A username can never contain "@", so the character cleanly separates the
  // two identifier namespaces without any precedence rule.
  const isEmail = submittedIdentifier.includes("@");
  let normalized: string;
  try {
    normalized = isEmail
      ? normalizeEmail(submittedIdentifier)
      : normalizeUsername(submittedIdentifier);
  } catch {
    await verifyPassword(DUMMY_PASSWORD_HASH, submittedPassword);
    return null;
  }

  const db = database ?? getDatabase();
  const [user] = await db
    .select()
    .from(users)
    .where(
      isEmail ? eq(users.email, normalized) : eq(users.username, normalized),
    )
    .limit(1);

  if (!user) {
    await verifyPassword(DUMMY_PASSWORD_HASH, submittedPassword);
    return null;
  }

  const passwordMatches = await verifyPassword(
    user.passwordHash,
    submittedPassword,
  );
  const now = new Date();

  if (
    !user.isActive ||
    (user.lockedUntil && user.lockedUntil > now) ||
    !passwordMatches
  ) {
    if (
      user.isActive &&
      (!user.lockedUntil || user.lockedUntil <= now) &&
      !passwordMatches
    ) {
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
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
        updatedAt: now,
      })
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
    .set({
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
