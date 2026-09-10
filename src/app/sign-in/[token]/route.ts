import { type NextRequest, NextResponse } from "next/server";

import { resolveOpenClassToken } from "@/modules/classes/services";
import {
  SIGN_IN_CONTEXT_COOKIE_NAME,
  SIGN_IN_REFERRER_POLICY,
  signInCookieOptions,
  TOKENLESS_SIGN_IN_PATH,
} from "@/modules/student-sign-in/context";
import {
  recognizeStudent,
  stagePendingRecognizedStudent,
} from "@/modules/student-sign-in/identification";
import {
  acquirePublicRateLimit,
  PUBLIC_RATE_LIMIT_OPERATIONS,
  recordPublicRateLimitFailure,
} from "@/modules/student-sign-in/rate-limit";
import {
  REMEMBERED_DEVICE_COOKIE_NAME,
  rememberedDeviceCookieOptions,
} from "@/modules/student-sign-in/remembered-device";
import { getTrustedRequestMetadata } from "@/modules/student-sign-in/request-security";
import { emptySignInWorkflowState } from "@/modules/student-sign-in/types";
import { createWorkflowFromClassToken } from "@/modules/student-sign-in/workflow";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

function unavailable(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL(`${TOKENLESS_SIGN_IN_PATH}?status=unavailable`, request.url),
  );
  response.headers.set("Referrer-Policy", SIGN_IN_REFERRER_POLICY);
  response.cookies.set(SIGN_IN_CONTEXT_COOKIE_NAME, "", signInCookieOptions(0));
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = getDatabase();
  const resolved = await resolveOpenClassToken(db, token);
  if (!resolved) return unavailable(request);
  if (resolved.accessPinEnabled) {
    if (!resolved.publicCode) return unavailable(request);
    const response = NextResponse.redirect(
      new URL(`/sign-in/pin/${resolved.publicCode}`, request.url),
    );
    response.headers.set("Referrer-Policy", SIGN_IN_REFERRER_POLICY);
    return response;
  }

  const metadata = await getTrustedRequestMetadata(request);
  const lease = await acquirePublicRateLimit(db, {
    classId: resolved.id,
    operation: PUBLIC_RATE_LIMIT_OPERATIONS.WORKFLOW_CREATION,
    requestSourceFingerprint: metadata.requestSourceFingerprint,
  });
  if (!lease.allowed) return unavailable(request);

  const stagingLease = await acquirePublicRateLimit(db, {
    classId: resolved.id,
    operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE,
    requestSourceFingerprint: metadata.requestSourceFingerprint,
  });
  if (!stagingLease.allowed) return unavailable(request);

  const rememberedToken = request.cookies.get(
    REMEMBERED_DEVICE_COOKIE_NAME,
  )?.value;
  let recognition: Awaited<ReturnType<typeof recognizeStudent>> = {
    status: "recovery_or_guest",
  };
  let workflow: Awaited<ReturnType<typeof createWorkflowFromClassToken>> = null;
  try {
    recognition = rememberedToken
      ? await recognizeStudent(db, { rememberedToken })
      : recognition;
    const initialState =
      recognition.status === "identified"
        ? stagePendingRecognizedStudent(emptySignInWorkflowState(), recognition)
        : emptySignInWorkflowState();
    workflow = await createWorkflowFromClassToken(db, token, initialState);
  } catch {
    await Promise.all([
      recordPublicRateLimitFailure(db, lease),
      recordPublicRateLimitFailure(db, stagingLease),
    ]);
    return unavailable(request);
  }
  if (!workflow) {
    await Promise.all([
      recordPublicRateLimitFailure(db, lease),
      recordPublicRateLimitFailure(db, stagingLease),
    ]);
    return unavailable(request);
  }

  const response = NextResponse.redirect(
    new URL(TOKENLESS_SIGN_IN_PATH, request.url),
  );
  response.headers.set("Referrer-Policy", SIGN_IN_REFERRER_POLICY);
  response.cookies.set(
    SIGN_IN_CONTEXT_COOKIE_NAME,
    workflow.token,
    signInCookieOptions(),
  );
  if (rememberedToken && recognition.status !== "identified") {
    response.cookies.set(
      REMEMBERED_DEVICE_COOKIE_NAME,
      "",
      rememberedDeviceCookieOptions(0),
    );
  }
  return response;
}
