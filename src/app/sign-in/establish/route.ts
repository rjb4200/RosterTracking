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
 * This is a route handler rather than page logic because a cookie can only be
 * set on a response, and setting it during a Server Component render is not
 * supported. The entry routes hand the class reference here instead of setting
 * the cookie themselves: a cookie set on a response to a cross-site navigation
 * is a third-party cookie, and `SameSite=Lax` is not accepted in that context,
 * so the browser discards it. This response is first-party, so it is stored.
 */
export async function GET(request: NextRequest) {
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
  return response;
}
