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

export async function submitAccessPin(formData: FormData) {
  const code = formData.get("code");
  const pin = formData.get("pin");
  if (
    typeof code !== "string" ||
    typeof pin !== "string" ||
    !isClassPublicCode(code) ||
    !isClassAccessPin(pin) ||
    !(await validateSameOriginRequest())
  ) {
    redirect("/sign-in?status=unavailable");
  }

  const db = getDatabase();
  const resolved = await resolveOpenClassPublicCode(db, code);
  if (!resolved?.accessPinEnabled) redirect("/sign-in?status=unavailable");
  const metadata = await getTrustedRequestMetadata();
  const lease = await acquirePublicRateLimit(db, {
    classId: resolved.id,
    operation: PUBLIC_RATE_LIMIT_OPERATIONS.ACCESS_PIN_VERIFICATION,
    requestSourceFingerprint: metadata.requestSourceFingerprint,
    identifierFingerprint: rateLimitIdentifierFingerprint(
      PUBLIC_RATE_LIMIT_OPERATIONS.ACCESS_PIN_VERIFICATION,
      pin,
    ),
  });
  if (!lease.allowed) redirect("/sign-in?status=unavailable");

  const verified = await verifyOpenClassAccessPin(db, code, pin);
  if (!verified) {
    await recordPublicRateLimitFailure(db, lease);
    redirect(`/sign-in/pin/${code}?notice=invalid`);
  }
  const workflow = await createWorkflowFromOpenClass(
    db,
    verified.id,
    verified.signInTokenVersion,
  );
  if (!workflow) redirect("/sign-in?status=unavailable");
  (await cookies()).set(
    SIGN_IN_CONTEXT_COOKIE_NAME,
    workflow.token,
    signInCookieOptions(),
  );
  redirect("/sign-in");
}
