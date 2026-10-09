import { renderParticipantNotice } from "@/modules/individual-training-notices/service";
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
  {
    params,
  }: {
    params: Promise<{ revisionId: string; attendanceId: string }>;
  },
) {
  try {
    const actor = await requireStaff();
    const { revisionId, attendanceId } = await params;
    const variant =
      new URL(request.url).searchParams.get("variant") === "white"
        ? "white"
        : "yellow";
    const notice = await renderParticipantNotice(
      getDatabase(),
      actor,
      revisionId,
      attendanceId,
      variant,
    );
    const body = notice.bytes.buffer.slice(
      notice.bytes.byteOffset,
      notice.bytes.byteOffset + notice.bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${
          new URL(request.url).searchParams.get("disposition") === "inline"
            ? "inline"
            : "attachment"
        }; filename="${notice.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const correlationId = correlationIdFromHeaders(request.headers);
    // Do not reveal revision or participant existence to unauthorized users.
    logServerFailure({
      failureKind: classifyServerFailure(error),
      route: "/api/staff/training-notices/[revisionId]/[attendanceId]",
      correlationId,
    });
    return new Response("Not found.", { status: 404 });
  }
}
