import "server-only";

import { cookies } from "next/headers";

import {
  resolveOpenClassPublicCode,
  resolveOpenClassToken,
} from "@/modules/classes/services";
import { isClassPublicCode } from "@/modules/classes/token";
import type { Database } from "@/server/db/client";

import { SIGN_IN_CONTEXT_COOKIE_NAME, signInCookieOptions } from "./context";
import { classifyFailure, logSignInFailure } from "./failure-log";
import {
  recognizeStudent,
  stagePendingRecognizedStudent,
} from "./identification";
import {
  acquirePublicRateLimit,
  PUBLIC_RATE_LIMIT_OPERATIONS,
  recordPublicRateLimitFailure,
} from "./rate-limit";
import {
  REMEMBERED_DEVICE_COOKIE_NAME,
  rememberedDeviceCookieOptions,
} from "./remembered-device";
import type { getTrustedRequestMetadata } from "./request-security";
import { emptySignInWorkflowState } from "./types";
import {
  createWorkflowFromClassToken,
  createWorkflowFromOpenClass,
  loadSignInWorkflow,
} from "./workflow";

export interface EstablishSignInContextInput {
  /** The requested class public code, when the visitor came through a class link. */
  publicCode?: string;
  /** The requested raw sign-in token, when the visitor came through a token link. */
  rawToken?: string;
  /** Server-only proof returned by verifyOpenClassAccessPin, never request data. */
  verifiedPinAccess?: { id: string; signInTokenVersion: number };
  metadata: Awaited<ReturnType<typeof getTrustedRequestMetadata>>;
}

export type EstablishSignInContextResult =
  | { status: "established"; classId: string }
  | { status: "unavailable" };

/**
 * Establishes the student sign-in context for an intentional class entry.
 * Call only from a route handler or server action that can write cookies.
 *
 * Minting is idempotent: a valid existing context for the same class is reused so
 * a reload does not discard the visitor's progress.
 */
export async function establishSignInContext(
  db: Database,
  input: EstablishSignInContextInput,
): Promise<EstablishSignInContextResult> {
  const resolved = await resolveRequestedClass(db, input);
  if (!resolved) return { status: "unavailable" };
  const { classId, tokenVersion } = resolved;

  const cookieStore = await cookies();
  const existing = cookieStore.get(SIGN_IN_CONTEXT_COOKIE_NAME)?.value;
  if (await isContextForClass(db, existing, classId)) {
    return { status: "established", classId };
  }

  const [workflowLease, stagingLease] = await Promise.all([
    acquirePublicRateLimit(db, {
      classId,
      operation: PUBLIC_RATE_LIMIT_OPERATIONS.WORKFLOW_CREATION,
      requestSourceFingerprint: input.metadata.requestSourceFingerprint,
    }),
    acquirePublicRateLimit(db, {
      classId,
      operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE,
      requestSourceFingerprint: input.metadata.requestSourceFingerprint,
    }),
  ]);
  if (!workflowLease.allowed || !stagingLease.allowed) {
    return { status: "unavailable" };
  }

  const rememberedToken = cookieStore.get(REMEMBERED_DEVICE_COOKIE_NAME)?.value;
  try {
    const recognition = rememberedToken
      ? await recognizeStudent(db, { rememberedToken })
      : { status: "recovery_or_guest" as const };
    const initialState =
      recognition.status === "identified"
        ? stagePendingRecognizedStudent(emptySignInWorkflowState(), recognition)
        : emptySignInWorkflowState();
    const workflow = input.rawToken
      ? await createWorkflowFromClassToken(db, input.rawToken, initialState)
      : await createWorkflowFromOpenClass(
          db,
          classId,
          tokenVersion,
          initialState,
        );
    if (!workflow) {
      await Promise.all([
        recordPublicRateLimitFailure(db, workflowLease),
        recordPublicRateLimitFailure(db, stagingLease),
      ]);
      return { status: "unavailable" };
    }

    cookieStore.set(
      SIGN_IN_CONTEXT_COOKIE_NAME,
      workflow.token,
      signInCookieOptions(),
    );
    if (rememberedToken && recognition.status !== "identified") {
      cookieStore.set(
        REMEMBERED_DEVICE_COOKIE_NAME,
        "",
        rememberedDeviceCookieOptions(0),
      );
    }
    return { status: "established", classId };
  } catch (error) {
    logSignInFailure({
      correlationId: input.metadata.requestCorrelationId,
      failureKind: classifyFailure(error),
      route: "/sign-in",
      classId,
    });
    await Promise.all([
      recordPublicRateLimitFailure(db, workflowLease),
      recordPublicRateLimitFailure(db, stagingLease),
    ]);
    return { status: "unavailable" };
  }
}

/**
 * Reports whether an existing signed context is valid for the resolved class, so
 * a reload reuses it instead of resetting the visitor's progress.
 */
async function isContextForClass(
  db: Database,
  signedContext: string | undefined,
  classId: string,
): Promise<boolean> {
  if (!signedContext) return false;
  try {
    const loaded = await loadSignInWorkflow(db, signedContext);
    return loaded.context.classId === classId;
  } catch {
    return false;
  }
}

/**
 * Resolves the class the visitor asked for, using only the public code or raw
 * token carried on the request. Returns null when the requested class cannot be
 * resolved as an open class, so the caller can return the generic response.
 */
async function resolveRequestedClass(
  db: Database,
  input: EstablishSignInContextInput,
): Promise<{ classId: string; tokenVersion: number } | null> {
  if (input.publicCode && isClassPublicCode(input.publicCode)) {
    const resolved = await resolveOpenClassPublicCode(db, input.publicCode);
    if (
      resolved?.accessPinEnabled &&
      (input.verifiedPinAccess?.id !== resolved.id ||
        input.verifiedPinAccess.signInTokenVersion !==
          resolved.signInTokenVersion)
    ) {
      return null;
    }
    return resolved
      ? { classId: resolved.id, tokenVersion: resolved.signInTokenVersion }
      : null;
  }
  if (input.rawToken) {
    const resolved = await resolveOpenClassToken(db, input.rawToken);
    if (resolved?.accessPinEnabled) return null;
    return resolved
      ? { classId: resolved.id, tokenVersion: resolved.signInTokenVersion }
      : null;
  }
  return null;
}
