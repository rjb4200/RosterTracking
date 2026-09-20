import { type NextRequest, NextResponse } from "next/server";

import { resolveOpenClassPublicCode } from "@/modules/classes/services";
import { isClassPublicCode } from "@/modules/classes/token";
import {
  SIGN_IN_REFERRER_POLICY,
  TOKENLESS_SIGN_IN_PATH,
} from "@/modules/student-sign-in/context";
import {
  classifyFailure,
  logSignInFailure,
} from "@/modules/student-sign-in/failure-log";
import { getTrustedRequestMetadata } from "@/modules/student-sign-in/request-security";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Referrer-Policy", SIGN_IN_REFERRER_POLICY);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function unavailable(request: NextRequest) {
  return redirect(request, `${TOKENLESS_SIGN_IN_PATH}?status=unavailable`);
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
      return redirect(request, `/sign-in/pin/${code}`);
    }

    // Context establishment validates or replaces the existing session. Entry
    // itself must not clear it: speculative requests can arrive at any time.
    return redirect(
      request,
      `/sign-in/establish?class=${encodeURIComponent(code)}`,
    );
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
