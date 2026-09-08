import { generateOfficialRoster } from "@/modules/official-roster-pdfs/service";
import { requireStaff } from "@/modules/staff-auth/authorization";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ revisionId: string; formType: string }>;
  },
) {
  try {
    const actor = await requireStaff();
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
        "Content-Disposition": `${
          new URL(request.url).searchParams.get("disposition") === "inline"
            ? "inline"
            : "attachment"
        }; filename="${roster.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    // Do not reveal revision existence or snapshot content to unauthorized users.
    console.error("Official roster request failed.", error);
    return new Response("Not found.", { status: 404 });
  }
}
