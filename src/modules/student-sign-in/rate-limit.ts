import "server-only";

import { and, inArray, lt, sql } from "drizzle-orm";

import type { Database, DatabaseTransaction } from "@/server/db/client";
import { publicRateLimitWindows } from "@/server/db/schema";

import { keyedHash } from "./crypto";

export const PUBLIC_RATE_LIMIT_OPERATIONS = {
  WORKFLOW_CREATION: "workflow_creation",
  STAGING_WRITE: "staging_write",
  CURRENT_PHONE_LOOKUP: "current_phone_lookup",
  PRIOR_PHONE_RECOVERY: "prior_phone_recovery",
  FFN_VERIFICATION: "ffn_verification",
  KEMSIS_VERIFICATION: "kemsis_verification",
  REGULAR_CONFIRMATION: "regular_confirmation",
  GUEST_CONFIRMATION: "guest_confirmation",
  ACCESS_PIN_VERIFICATION: "access_pin_verification",
} as const;

export type PublicRateLimitOperation =
  (typeof PUBLIC_RATE_LIMIT_OPERATIONS)[keyof typeof PUBLIC_RATE_LIMIT_OPERATIONS];

export interface PublicRateLimitPolicy {
  windowSeconds: number;
  sourceAttempts: number;
  identifierAttempts?: number;
  failures: number;
}

export const PUBLIC_RATE_LIMIT_POLICIES: Record<
  PublicRateLimitOperation,
  PublicRateLimitPolicy
> = {
  workflow_creation: { windowSeconds: 600, sourceAttempts: 20, failures: 20 },
  staging_write: { windowSeconds: 600, sourceAttempts: 80, failures: 20 },
  current_phone_lookup: {
    windowSeconds: 900,
    sourceAttempts: 15,
    identifierAttempts: 6,
    failures: 8,
  },
  prior_phone_recovery: {
    windowSeconds: 900,
    sourceAttempts: 10,
    identifierAttempts: 5,
    failures: 6,
  },
  ffn_verification: {
    windowSeconds: 900,
    sourceAttempts: 8,
    identifierAttempts: 4,
    failures: 5,
  },
  kemsis_verification: {
    windowSeconds: 900,
    sourceAttempts: 8,
    identifierAttempts: 4,
    failures: 5,
  },
  regular_confirmation: {
    windowSeconds: 600,
    sourceAttempts: 15,
    identifierAttempts: 6,
    failures: 8,
  },
  guest_confirmation: {
    windowSeconds: 3600,
    sourceAttempts: 10,
    identifierAttempts: 5,
    failures: 10,
  },
  access_pin_verification: {
    windowSeconds: 600,
    sourceAttempts: 30,
    identifierAttempts: 10,
    failures: 10,
  },
};

const SOURCE_SCOPE = "source";
const IDENTIFIER_SCOPE = "identifier";

export function rateLimitIdentifierFingerprint(
  operation: PublicRateLimitOperation,
  normalizedIdentifier: string,
): string {
  return keyedHash(
    `sign-in-rate-identifier:${operation}`,
    normalizedIdentifier.trim(),
  );
}

export function rateLimitWindowStart(now: Date, windowSeconds: number): Date {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

async function incrementWindow(
  transaction: DatabaseTransaction,
  values: {
    classId: string;
    operation: PublicRateLimitOperation;
    requestSourceFingerprint: string;
    identifierFingerprint: string;
    windowStartedAt: Date;
    expiresAt: Date;
    now: Date;
  },
) {
  const [row] = await transaction
    .insert(publicRateLimitWindows)
    .values({
      ...values,
      attemptCount: 1,
      failureCount: 0,
      updatedAt: values.now,
    })
    .onConflictDoUpdate({
      target: [
        publicRateLimitWindows.classId,
        publicRateLimitWindows.operation,
        publicRateLimitWindows.requestSourceFingerprint,
        publicRateLimitWindows.identifierFingerprint,
        publicRateLimitWindows.windowStartedAt,
      ],
      set: {
        attemptCount: sql`${publicRateLimitWindows.attemptCount} + 1`,
        updatedAt: values.now,
      },
    })
    .returning({
      id: publicRateLimitWindows.id,
      attemptCount: publicRateLimitWindows.attemptCount,
      failureCount: publicRateLimitWindows.failureCount,
    });
  if (!row) throw new Error("Rate limit window was not recorded.");
  return row;
}

export interface PublicRateLimitLease {
  allowed: boolean;
  windowIds: string[];
  retryAfterSeconds: number;
}

export async function acquirePublicRateLimit(
  db: Database,
  input: {
    classId: string;
    operation: PublicRateLimitOperation;
    requestSourceFingerprint: string;
    identifierFingerprint?: string;
    now?: Date;
  },
): Promise<PublicRateLimitLease> {
  const now = input.now ?? new Date();
  const policy = PUBLIC_RATE_LIMIT_POLICIES[input.operation];
  const windowStartedAt = rateLimitWindowStart(now, policy.windowSeconds);
  const expiresAt = new Date(
    windowStartedAt.getTime() + policy.windowSeconds * 1000,
  );
  const scopedSource = keyedHash("sign-in-rate-scope", SOURCE_SCOPE);
  const scopedIdentifier = keyedHash("sign-in-rate-scope", IDENTIFIER_SCOPE);

  return db.transaction(async (transaction) => {
    const source = await incrementWindow(transaction, {
      classId: input.classId,
      operation: input.operation,
      requestSourceFingerprint: input.requestSourceFingerprint,
      identifierFingerprint: scopedSource,
      windowStartedAt,
      expiresAt,
      now,
    });
    const identifier = input.identifierFingerprint
      ? await incrementWindow(transaction, {
          classId: input.classId,
          operation: input.operation,
          requestSourceFingerprint: scopedIdentifier,
          identifierFingerprint: input.identifierFingerprint,
          windowStartedAt,
          expiresAt,
          now,
        })
      : null;
    const sourceAllowed =
      source.attemptCount <= policy.sourceAttempts &&
      source.failureCount < policy.failures;
    const identifierAllowed =
      !identifier ||
      (identifier.attemptCount <=
        (policy.identifierAttempts ?? policy.sourceAttempts) &&
        identifier.failureCount < policy.failures);
    return {
      allowed: sourceAllowed && identifierAllowed,
      windowIds: [source.id, ...(identifier ? [identifier.id] : [])],
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((expiresAt.getTime() - now.getTime()) / 1000),
      ),
    };
  });
}

export async function recordPublicRateLimitFailure(
  db: Database,
  lease: PublicRateLimitLease,
  now = new Date(),
): Promise<void> {
  if (!lease.allowed || lease.windowIds.length === 0) return;
  await db
    .update(publicRateLimitWindows)
    .set({
      failureCount: sql`${publicRateLimitWindows.failureCount} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        inArray(publicRateLimitWindows.id, lease.windowIds),
        lt(
          publicRateLimitWindows.failureCount,
          publicRateLimitWindows.attemptCount,
        ),
      ),
    );
}

export async function cleanupPublicRateLimitWindows(
  db: Database,
  now = new Date(),
  limit = 100,
): Promise<number> {
  const boundedLimit = Math.max(1, Math.min(limit, 500));
  const expired = await db
    .select({ id: publicRateLimitWindows.id })
    .from(publicRateLimitWindows)
    .where(lt(publicRateLimitWindows.expiresAt, now))
    .orderBy(publicRateLimitWindows.expiresAt)
    .limit(boundedLimit);
  if (expired.length === 0) return 0;
  const deleted = await db
    .delete(publicRateLimitWindows)
    .where(
      and(
        inArray(
          publicRateLimitWindows.id,
          expired.map(({ id }) => id),
        ),
        lt(publicRateLimitWindows.expiresAt, now),
      ),
    )
    .returning({ id: publicRateLimitWindows.id });
  return deleted.length;
}
