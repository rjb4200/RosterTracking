import { generateOfficialRoster } from "@/modules/official-roster-pdfs/service";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ revisionId: string; formType: string }>;
  },
) {
  try {
    const actor = await requireActor(PERMISSIONS.OFFICIAL_ROSTERS_MANAGE);
    const { revisionId, formType } = await params;
    if (formType !== "kfs-1a" && formType !== "kbems-e16") {
      throw new Error("Unknown official roster form.");
    }
    const roster = await generateOfficialRoster(
      getDatabase(),
      actor,
      revisionId,
      formType,
    );
    const body = roster.bytes.buffer.slice(
      roster.bytes.byteOffset,
      roster.bytes.byteOffset + roster.bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${roster.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    // Do not reveal revision existence or snapshot content to unauthorized users.
    return new Response("Not found.", { status: 404 });
  }
}
