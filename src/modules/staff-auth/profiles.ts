import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import { users } from "@/server/db/schema";

import {
  changedProfileAttributes,
  type ProfileInput,
  type ProfileValues,
  parseProfileInput,
  type StaffProfile,
} from "./profile-contract";
import { requireAdministrator } from "./staff-accounts";

export type { StaffProfile } from "./profile-contract";

const profileColumns = {
  id: users.id,
  ffn: users.ffn,
  instructorLevel: users.instructorLevel,
  emsProviderNumber: users.emsProviderNumber,
} as const;

async function loadProfile(
  transaction: DatabaseTransaction,
  userId: string,
): Promise<StaffProfile | null> {
  const [row] = await transaction
    .select(profileColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  return {
    userId: row.id,
    ffn: row.ffn,
    instructorLevel: row.instructorLevel,
    emsProviderNumber: row.emsProviderNumber,
  };
}

export async function getStaffProfile(
  db: Database,
  userId: string,
): Promise<StaffProfile | null> {
  const [row] = await db
    .select(profileColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  return {
    userId: row.id,
    ffn: row.ffn,
    instructorLevel: row.instructorLevel,
    emsProviderNumber: row.emsProviderNumber,
  };
}

async function assertFfnAvailable(
  transaction: DatabaseTransaction,
  targetUserId: string,
  before: ProfileValues,
  after: ProfileValues,
) {
  if (!after.ffn || after.ffn === before.ffn) return;
  const [duplicate] = await transaction
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.ffn, after.ffn), ne(users.id, targetUserId)))
    .limit(1);
  if (duplicate) {
    throw new Error("That FFN is already assigned to another staff member.");
  }
}

async function applyProfile(
  transaction: DatabaseTransaction,
  input: {
    actorId: string;
    targetUserId: string;
    before: ProfileValues;
    after: ProfileValues;
  },
) {
  const changed = changedProfileAttributes(input.before, input.after);
  if (changed.length === 0) return;

  await assertFfnAvailable(
    transaction,
    input.targetUserId,
    input.before,
    input.after,
  );

  await transaction
    .update(users)
    .set({
      ffn: input.after.ffn,
      instructorLevel: input.after.instructorLevel,
      emsProviderNumber: input.after.emsProviderNumber,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.targetUserId));

  await writeAuditLog(transaction, {
    actorUserId: input.actorId,
    actorType: "user",
    action: "staff.profile.updated",
    entityType: "user",
    entityId: input.targetUserId,
    details: { attributes: changed },
  });
}

/**
 * Self-service update. The target is always the actor, and only the three
 * profile attributes are accepted, so this path can never change a role,
 * username, status, or password.
 */
export async function updateOwnProfile(
  db: Database,
  actorId: string,
  input: ProfileInput,
): Promise<void> {
  const after = parseProfileInput(input);
  await db.transaction(async (transaction) => {
    const before = await loadProfile(transaction, actorId);
    if (!before) throw new Error("Staff account not found.");
    await applyProfile(transaction, {
      actorId,
      targetUserId: actorId,
      before,
      after,
    });
  });
}

/** Administrator update for any staff user's profile. */
export async function updateStaffProfile(
  db: Database,
  actorId: string,
  targetUserId: string,
  input: ProfileInput,
): Promise<void> {
  const after = parseProfileInput(input);
  await db.transaction(async (transaction) => {
    await requireAdministrator(transaction, actorId);
    const before = await loadProfile(transaction, targetUserId);
    if (!before) throw new Error("Staff account not found.");
    await applyProfile(transaction, {
      actorId,
      targetUserId,
      before,
      after,
    });
  });
}
