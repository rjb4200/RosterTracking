import { renderClassSignInRecordPdf } from "@/modules/class-sign-in-record/pdf";
import { getClassSignInRecord } from "@/modules/class-sign-in-record/service";
import { requireStaff } from "@/modules/staff-auth/authorization";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  try {
    const actor = await requireStaff();
    const { classId } = await params;
    const record = await getClassSignInRecord(getDatabase(), actor, classId);
    const bytes = await renderClassSignInRecordPdf(record);
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${
          new URL(request.url).searchParams.get("disposition") === "inline"
            ? "inline"
            : "attachment"
        }; filename="class-sign-in-record.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    // Do not reveal class or attendance existence to unauthorized users.
    console.error("Class sign-in record request failed.", error);
    return new Response("Not found.", { status: 404 });
  }
}
