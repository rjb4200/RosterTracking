import { renderClassAuditLogPdf } from "@/modules/class-audit-log/pdf";
import { getClassAuditLog } from "@/modules/class-audit-log/service";
import { requireStaff } from "@/modules/staff-auth/authorization";
import { getDatabase } from "@/server/db/client";
import {
  classifyServerFailure,
  correlationIdFromHeaders,
  logServerFailure,
} from "@/server/server-failure-log";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  try {
    const actor = await requireStaff();
    const { classId } = await params;
    const log = await getClassAuditLog(getDatabase(), actor, classId);
    const bytes = await renderClassAuditLogPdf(log);
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
        }; filename="class-audit-log.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    // Do not reveal class or audit existence to unauthorized users.
    logServerFailure({
      failureKind: classifyServerFailure(error),
      route: "/api/staff/class-audit-log/[classId]",
      correlationId: correlationIdFromHeaders(request.headers),
    });
    return new Response("Not found.", { status: 404 });
  }
}
