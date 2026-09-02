import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, gt, inArray, isNull, lt } from "drizzle-orm";

import { CLASS_STATUSES } from "@/modules/classes/constants";
import { hashClassSignInToken } from "@/modules/classes/token";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import { signInWorkflowStaging, trainingClasses } from "@/server/db/schema";

import {
  createSignInContext,
  hashWorkflowNonce,
  SIGN_IN_CONTEXT_TTL_SECONDS,
  validateSignInContext,
} from "./context";
import { decryptWorkflowState, encryptWorkflowState } from "./crypto";
import {
  emptySignInWorkflowState,
  type SignInWorkflowState,
  signInWorkflowStateSchema,
} from "./types";

export class InvalidSignInWorkflowError extends Error {
  constructor() {
    super("The sign-in session is unavailable or expired.");
    this.name = "InvalidSignInWorkflowError";
  }
}

export function encodeSignInWorkflowState(
  state: SignInWorkflowState,
  nonceHash: string,
): string {
  const parsed = signInWorkflowStateSchema.parse(state);
  return encryptWorkflowState(
    JSON.stringify(parsed),
    nonceHash,
    randomBytes(12),
  );
}

export function decodeSignInWorkflowState(
  encryptedState: string,
  nonceHash: string,
): SignInWorkflowState {
  try {
    return signInWorkflowStateSchema.parse(
      JSON.parse(decryptWorkflowState(encryptedState, nonceHash)),
    );
  } catch {
    throw new InvalidSignInWorkflowError();
  }
}

async function requireCurrentClass(
  transaction: DatabaseTransaction,
  classId: string,
  tokenVersion: number,
) {
  const [classRecord] = await transaction
    .select({
      id: trainingClasses.id,
      signInTokenVersion: trainingClasses.signInTokenVersion,
    })
    .from(trainingClasses)
    .where(
      and(
        eq(trainingClasses.id, classId),
        eq(trainingClasses.status, CLASS_STATUSES.OPEN),
        eq(trainingClasses.signInTokenVersion, tokenVersion),
      ),
    )
    .limit(1)
    .for("share");
  if (!classRecord) throw new InvalidSignInWorkflowError();
  return classRecord;
}

export async function createWorkflowFromClassToken(
  db: Database,
  rawToken: string,
  initialState: SignInWorkflowState = emptySignInWorkflowState(),
  now = new Date(),
) {
  await cleanupExpiredSignInWorkflows(db, now);
  return db.transaction(async (transaction) => {
    const [classRecord] = await transaction
      .select({
        id: trainingClasses.id,
        signInTokenVersion: trainingClasses.signInTokenVersion,
      })
      .from(trainingClasses)
      .where(
        and(
          eq(trainingClasses.signInTokenHash, hashClassSignInToken(rawToken)),
          eq(trainingClasses.status, CLASS_STATUSES.OPEN),
        ),
      )
      .limit(1)
      .for("share");
    if (!classRecord) return null;

    const created = createSignInContext(
      classRecord.id,
      classRecord.signInTokenVersion,
      now,
    );
    const nonceHash = hashWorkflowNonce(created.context.nonce);
    const expiresAt = new Date(created.context.expiresAt * 1000);
    await transaction.insert(signInWorkflowStaging).values({
      classId: classRecord.id,
      nonceHash,
      signInTokenVersion: classRecord.signInTokenVersion,
      idempotencyKey: created.context.idempotencyKey,
      encryptedState: encodeSignInWorkflowState(initialState, nonceHash),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    return { ...created, expiresAt };
  });
}

async function loadWithinTransaction(
  transaction: DatabaseTransaction,
  signedContext: string,
  now: Date,
) {
  const context = validateSignInContext(signedContext, now);
  if (!context) throw new InvalidSignInWorkflowError();
  await requireCurrentClass(transaction, context.classId, context.tokenVersion);
  const nonceHash = hashWorkflowNonce(context.nonce);
  const [staging] = await transaction
    .select()
    .from(signInWorkflowStaging)
    .where(
      and(
        eq(signInWorkflowStaging.classId, context.classId),
        eq(signInWorkflowStaging.nonceHash, nonceHash),
        eq(signInWorkflowStaging.signInTokenVersion, context.tokenVersion),
        eq(signInWorkflowStaging.idempotencyKey, context.idempotencyKey),
        gt(signInWorkflowStaging.expiresAt, now),
        isNull(signInWorkflowStaging.consumedAt),
      ),
    )
    .limit(1);
  if (!staging) throw new InvalidSignInWorkflowError();
  return {
    context,
    staging,
    nonceHash,
    state: decodeSignInWorkflowState(staging.encryptedState, nonceHash),
  };
}

export async function loadSignInWorkflow(
  db: Database,
  signedContext: string,
  now = new Date(),
) {
  return db.transaction((transaction) =>
    loadWithinTransaction(transaction, signedContext, now),
  );
}

export async function updateSignInWorkflow(
  db: Database,
  signedContext: string,
  state: SignInWorkflowState,
  now = new Date(),
) {
  return db.transaction(async (transaction) => {
    const loaded = await loadWithinTransaction(transaction, signedContext, now);
    const [updated] = await transaction
      .update(signInWorkflowStaging)
      .set({
        encryptedState: encodeSignInWorkflowState(state, loaded.nonceHash),
        updatedAt: now,
      })
      .where(
        and(
          eq(signInWorkflowStaging.id, loaded.staging.id),
          gt(signInWorkflowStaging.expiresAt, now),
          isNull(signInWorkflowStaging.consumedAt),
        ),
      )
      .returning({ id: signInWorkflowStaging.id });
    if (!updated) throw new InvalidSignInWorkflowError();
    return { context: loaded.context, state };
  });
}

export async function clearSignInWorkflow(
  db: Database,
  signedContext: string,
  now = new Date(),
): Promise<boolean> {
  try {
    return await db.transaction(async (transaction) => {
      const loaded = await loadWithinTransaction(
        transaction,
        signedContext,
        now,
      );
      const deleted = await transaction
        .delete(signInWorkflowStaging)
        .where(eq(signInWorkflowStaging.id, loaded.staging.id))
        .returning({ id: signInWorkflowStaging.id });
      return deleted.length > 0;
    });
  } catch (error) {
    if (error instanceof InvalidSignInWorkflowError) return false;
    throw error;
  }
}

export async function cleanupExpiredSignInWorkflows(
  db: Database,
  now = new Date(),
  limit = 100,
): Promise<number> {
  const boundedLimit = Math.max(1, Math.min(limit, 500));
  const expired = await db
    .select({ id: signInWorkflowStaging.id })
    .from(signInWorkflowStaging)
    .where(lt(signInWorkflowStaging.expiresAt, now))
    .orderBy(signInWorkflowStaging.expiresAt)
    .limit(boundedLimit);
  if (expired.length === 0) return 0;
  const deleted = await db
    .delete(signInWorkflowStaging)
    .where(
      and(
        inArray(
          signInWorkflowStaging.id,
          expired.map(({ id }) => id),
        ),
        lt(signInWorkflowStaging.expiresAt, now),
      ),
    )
    .returning({ id: signInWorkflowStaging.id });
  return deleted.length;
}

export { SIGN_IN_CONTEXT_TTL_SECONDS };
