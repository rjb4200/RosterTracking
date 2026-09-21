import { getClassRosterRefresh } from "@/modules/instructor-roster/services";
import { requirePermission } from "@/modules/staff-auth/authorization";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  try {
    const actor = await requirePermission(PERMISSIONS.CLASSES_MANAGE);
    const { classId } = await params;
    const roster = await getClassRosterRefresh(getDatabase(), actor, classId);
    return Response.json(roster, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    // Do not reveal class or attendance existence to unauthorized users.
    console.error("Class roster refresh failed.", error);
    return new Response("Not found.", { status: 404 });
  }
}
