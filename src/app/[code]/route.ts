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
import { getTrustedRequestMetadata } from "@/modules/student-sign-in/request-security";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Referrer-Policy", SIGN_IN_REFERRER_POLICY);
  // Clear any sign-in context a browser stored during a previous release. The
  // context is now established on the first-party sign-in page, and a stale
  // value must not shadow the freshly minted one.
  response.cookies.set(SIGN_IN_CONTEXT_COOKIE_NAME, "", signInCookieOptions(0));
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

    // Hand the class reference to the first-party context route, which
    // establishes the sign-in context on its own response and then redirects
    // to the clean sign-in page.
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
