import { type NextRequest, NextResponse } from "next/server";

import { resolveOpenClassPublicCode } from "@/modules/classes/services";
import { isClassPublicCode } from "@/modules/classes/token";
import {
  SIGN_IN_CONTEXT_COOKIE_NAME,
  SIGN_IN_REFERRER_POLICY,
  signInCookieOptions,
  TOKENLESS_SIGN_IN_PATH,
} from "@/modules/student-sign-in/context";
import {
  classifyFailure,
  logSignInFailure,
} from "@/modules/student-sign-in/failure-log";
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
import { createWorkflowFromOpenClass } from "@/modules/student-sign-in/workflow";
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
  { params }: { params: Promise<{ code: string }> },
) {
  const metadata = await getTrustedRequestMetadata(request);
  let classId: string | null = null;
  try {
    const { code } = await params;
    if (!isClassPublicCode(code)) return unavailable(request);

    const db = getDatabase();
    const resolved = await resolveOpenClassPublicCode(db, code);
    if (!resolved) return unavailable(request);
    classId = resolved.id;
    if (resolved.accessPinEnabled) {
      const response = NextResponse.redirect(
        new URL(`/sign-in/pin/${code}`, request.url),
      );
      response.headers.set("Referrer-Policy", SIGN_IN_REFERRER_POLICY);
      return response;
    }

    const [lease, stagingLease] = await Promise.all([
      acquirePublicRateLimit(db, {
        classId: resolved.id,
        operation: PUBLIC_RATE_LIMIT_OPERATIONS.WORKFLOW_CREATION,
        requestSourceFingerprint: metadata.requestSourceFingerprint,
      }),
      acquirePublicRateLimit(db, {
        classId: resolved.id,
        operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE,
        requestSourceFingerprint: metadata.requestSourceFingerprint,
      }),
    ]);
    if (!lease.allowed || !stagingLease.allowed) return unavailable(request);

    const rememberedToken = request.cookies.get(
      REMEMBERED_DEVICE_COOKIE_NAME,
    )?.value;
    let recognition: Awaited<ReturnType<typeof recognizeStudent>> = {
      status: "recovery_or_guest",
    };
    try {
      recognition = rememberedToken
        ? await recognizeStudent(db, { rememberedToken })
        : recognition;
      const initialState =
        recognition.status === "identified"
          ? stagePendingRecognizedStudent(
              emptySignInWorkflowState(),
              recognition,
            )
          : emptySignInWorkflowState();
      const workflow = await createWorkflowFromOpenClass(
        db,
        resolved.id,
        resolved.signInTokenVersion,
        initialState,
      );
      if (!workflow) throw new Error("Workflow unavailable.");
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
    } catch (error) {
      logSignInFailure({
        correlationId: metadata.requestCorrelationId,
        failureKind: classifyFailure(error),
        route: "/[code]",
        classId,
      });
      await Promise.all([
        recordPublicRateLimitFailure(db, lease),
        recordPublicRateLimitFailure(db, stagingLease),
      ]);
      return unavailable(request);
    }
  } catch (error) {
    logSignInFailure({
      correlationId: metadata.requestCorrelationId,
      failureKind: classifyFailure(error),
      route: "/[code]",
      classId,
    });
    return unavailable(request);
  }
}
