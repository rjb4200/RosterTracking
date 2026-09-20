import { type NextRequest, NextResponse } from "next/server";

import {
  SIGN_IN_REFERRER_POLICY,
  TOKENLESS_SIGN_IN_PATH,
} from "@/modules/student-sign-in/context";
import { establishSignInContext } from "@/modules/student-sign-in/establish-context";
import { getTrustedRequestMetadata } from "@/modules/student-sign-in/request-security";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

/**
 * Establishes the student sign-in context and redirects to the clean sign-in
 * page.
 *
 * Cookies must be written in a route handler or action, not during page render.
 * Speculative prefetches must never create or replace a student's session.
 */
export async function GET(request: NextRequest) {
  if (
    request.headers.has("next-router-prefetch") ||
    request.headers.get("purpose")?.toLowerCase().includes("prefetch") ||
    request.headers.get("sec-purpose")?.toLowerCase().includes("prefetch")
  ) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const publicCode = request.nextUrl.searchParams.get("class") ?? undefined;
  const rawToken = request.nextUrl.searchParams.get("token") ?? undefined;

  const established = await establishSignInContext(getDatabase(), {
    publicCode,
    rawToken,
    metadata: await getTrustedRequestMetadata(request),
  });

  const destination =
    established.status === "established"
      ? TOKENLESS_SIGN_IN_PATH
      : `${TOKENLESS_SIGN_IN_PATH}?status=unavailable`;
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Referrer-Policy", SIGN_IN_REFERRER_POLICY);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
