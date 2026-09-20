import { type NextRequest, NextResponse } from "next/server";

import { resolveOpenClassToken } from "@/modules/classes/services";
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
  { params }: { params: Promise<{ token: string }> },
) {
  const metadata = await getTrustedRequestMetadata(request);
  let classId: string | null = null;
  try {
    const { token } = await params;
    const db = getDatabase();
    const resolved = await resolveOpenClassToken(db, token);
    if (!resolved) return unavailable(request);
    classId = resolved.id;
    if (resolved.accessPinEnabled) {
      if (!resolved.publicCode) return unavailable(request);
      return redirect(request, `/sign-in/pin/${resolved.publicCode}`);
    }

    // Hand the raw token to the first-party context route, which establishes
    // the sign-in context on its own response and then redirects to the clean
    // sign-in page.
    return redirect(
      request,
      `/sign-in/establish?token=${encodeURIComponent(token)}`,
    );
  } catch (error) {
    logSignInFailure({
      correlationId: metadata.requestCorrelationId,
      failureKind: classifyFailure(error),
      route: "/sign-in/[token]",
      classId,
    });
    return unavailable(request);
  }
}
