import { runFinalizationReminders } from "@/modules/finalization-reminders/service";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Daily finalization-reminder schedule. Vercel Cron invokes this with the
 * `CRON_SECRET` bearer authorization; any other request is rejected. The run is
 * a no-op outside the live production environment so previews and development
 * never email.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (process.env.VERCEL_ENV !== "production") {
    return Response.json({ skipped: true, reason: "non-production" });
  }
  const summary = await runFinalizationReminders(getDatabase());
  return Response.json(summary);
}
