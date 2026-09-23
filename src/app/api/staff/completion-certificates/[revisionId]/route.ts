import { generateCompletionCertificates } from "@/modules/completion-certificates/service";
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
  { params }: { params: Promise<{ revisionId: string }> },
) {
  try {
    const actor = await requireStaff();
    const { revisionId } = await params;
    const certificates = await generateCompletionCertificates(
      getDatabase(),
      actor,
      revisionId,
    );
    const body = certificates.bytes.buffer.slice(
      certificates.bytes.byteOffset,
      certificates.bytes.byteOffset + certificates.bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${
          new URL(request.url).searchParams.get("disposition") === "inline"
            ? "inline"
            : "attachment"
        }; filename="${certificates.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const correlationId = correlationIdFromHeaders(request.headers);
    // Do not reveal revision existence or certificate content to unauthorized users.
    logServerFailure({
      failureKind: classifyServerFailure(error),
      route: "/api/staff/completion-certificates/[revisionId]",
      correlationId,
    });
    return new Response("Not found.", { status: 404 });
  }
}
