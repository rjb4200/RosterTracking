import { requireStaff } from "@/modules/staff-auth/authorization";
import { checkCredentialKeyHealth } from "@/modules/student-sign-in/key-health";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Internal key-health signal. Staff-only: it reports configuration health, not
 * any credential or PIN value, but it should not be publicly probeable.
 */
export async function GET() {
  try {
    await requireStaff();
  } catch {
    return new Response("Not found.", { status: 404 });
  }
  const report = await checkCredentialKeyHealth(getDatabase());
  return Response.json(report, {
    status: report.healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
