import { downloadOfficialRoster } from "@/modules/official-roster-pdfs/service";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/staff/official-rosters/[id]">,
) {
  try {
    const actor = await requireActor(PERMISSIONS.OFFICIAL_ROSTERS_MANAGE);
    const { id } = await params;
    const artifact = await downloadOfficialRoster(getDatabase(), actor, id);
    const body = artifact.bytes.buffer.slice(
      artifact.bytes.byteOffset,
      artifact.bytes.byteOffset + artifact.bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    // Do not reveal artifact existence or storage information to unauthorized users.
    return new Response("Not found.", { status: 404 });
  }
}
