import {
  generateOfficialRoster,
  UnreadableRevisionSnapshotError,
} from "@/modules/official-roster-pdfs/service";
import { requireStaff } from "@/modules/staff-auth/authorization";
import { writeAuditLog } from "@/server/db/audit";
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
    params: Promise<{ revisionId: string; formType: string }>;
  },
) {
  try {
    const actor = await requireStaff();
    const { revisionId, formType } = await params;
    if (formType !== "kfs-1a" && formType !== "kbems-e16") {
      throw new Error("Unknown official roster form.");
    }
    const db = getDatabase();
    const roster = await generateOfficialRoster(
      db,
      actor,
      revisionId,
      formType,
    );
    // The roster is generated before external reporting, so the entry fields
    // are left blank; record who generated it and that the fields were blank.
    await db.transaction(async (transaction) => {
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "official_roster.generated",
        entityType: "finalization_revision",
        entityId: revisionId,
        details: { formType, entryFieldsBlank: formType === "kfs-1a" },
      });
    });
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
    const correlationId = correlationIdFromHeaders(request.headers);
    if (error instanceof UnreadableRevisionSnapshotError) {
      // Authorized staff need a specific, actionable message; the snapshot is
      // unreadable rather than the revision being missing.
      logServerFailure({
        failureKind: "UnreadableRevisionSnapshotError",
        route: "/api/staff/official-rosters/[revisionId]/[formType]",
        correlationId,
      });
      return new Response(error.message, {
        status: 422,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    // Do not reveal revision existence or snapshot content to unauthorized users.
    logServerFailure({
      failureKind: classifyServerFailure(error),
      route: "/api/staff/official-rosters/[revisionId]/[formType]",
      correlationId,
    });
    return new Response("Not found.", { status: 404 });
  }
}
