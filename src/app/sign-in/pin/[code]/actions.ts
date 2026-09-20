"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  resolveOpenClassPublicCode,
  verifyOpenClassAccessPin,
} from "@/modules/classes/services";
import { isClassAccessPin, isClassPublicCode } from "@/modules/classes/token";
import {
  SIGN_IN_CONTEXT_COOKIE_NAME,
  signInCookieOptions,
} from "@/modules/student-sign-in/context";
import {
  classifyFailure,
  logSignInFailure,
} from "@/modules/student-sign-in/failure-log";
import {
  acquirePublicRateLimit,
  PUBLIC_RATE_LIMIT_OPERATIONS,
  rateLimitIdentifierFingerprint,
  recordPublicRateLimitFailure,
} from "@/modules/student-sign-in/rate-limit";
import {
  getTrustedRequestMetadata,
  validateSameOriginRequest,
} from "@/modules/student-sign-in/request-security";
import { createWorkflowFromOpenClass } from "@/modules/student-sign-in/workflow";
import { getDatabase } from "@/server/db/client";

const UNAVAILABLE = "/sign-in?status=unavailable";
const INVALID = (code: string) => `/sign-in/pin/${code}?notice=invalid`;

export async function submitAccessPin(formData: FormData) {
  let destination = UNAVAILABLE;
  let correlationId = "unknown";
  let classId: string | null = null;
  try {
    const code = formData.get("code");
    const pin = formData.get("pin");
    if (
      typeof code !== "string" ||
      typeof pin !== "string" ||
      !isClassPublicCode(code) ||
      !isClassAccessPin(pin) ||
      !(await validateSameOriginRequest())
    ) {
      redirect(UNAVAILABLE);
    }

    const db = getDatabase();
    const resolved = await resolveOpenClassPublicCode(db, code);
    if (!resolved?.accessPinEnabled) redirect(UNAVAILABLE);
    classId = resolved.id;
    const metadata = await getTrustedRequestMetadata();
    correlationId = metadata.requestCorrelationId;
    const lease = await acquirePublicRateLimit(db, {
      classId: resolved.id,
      operation: PUBLIC_RATE_LIMIT_OPERATIONS.ACCESS_PIN_VERIFICATION,
      requestSourceFingerprint: metadata.requestSourceFingerprint,
      identifierFingerprint: rateLimitIdentifierFingerprint(
        PUBLIC_RATE_LIMIT_OPERATIONS.ACCESS_PIN_VERIFICATION,
        pin,
      ),
    });
    if (!lease.allowed) redirect(UNAVAILABLE);

    const verified = await verifyOpenClassAccessPin(db, code, pin);
    if (!verified) {
      await recordPublicRateLimitFailure(db, lease);
      redirect(INVALID(code));
    }
    const workflow = await createWorkflowFromOpenClass(
      db,
      verified.id,
      verified.signInTokenVersion,
    );
    if (!workflow) redirect(UNAVAILABLE);
    (await cookies()).set(
      SIGN_IN_CONTEXT_COOKIE_NAME,
      workflow.token,
      signInCookieOptions(),
    );
    destination = "/sign-in";
  } catch (error) {
    // redirect() throws a control-flow signal; let it propagate untouched.
    if (isRedirect(error)) throw error;
    logSignInFailure({
      correlationId,
      failureKind: classifyFailure(error),
      route: "/sign-in/pin/[code]",
      classId,
    });
  }
  redirect(destination);
}

function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
