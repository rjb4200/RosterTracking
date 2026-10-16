import { parseReportPeriod } from "@/modules/reports/period";
import { getReport } from "@/modules/reports/registry";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { PERMISSIONS, ROLE_CODES } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const staff = await getCurrentStaff();
    if (!staff) {
      return Response.json(
        { error: "Sign in to generate reports." },
        { status: 401, headers: privateHeaders },
      );
    }
    if (
      !staff.permissions.has(PERMISSIONS.REPORTING_MANAGE) ||
      (!staff.roleCodes.has(ROLE_CODES.ADMINISTRATOR) &&
        !staff.roleCodes.has(ROLE_CODES.TRAINING_MAJOR))
    ) {
      return Response.json(
        { error: "Report access denied." },
        { status: 403, headers: privateHeaders },
      );
    }
    const query = new URL(request.url).searchParams;
    const report = getReport(query.get("report") ?? "");
    if (!report) {
      return Response.json(
        { error: "Select an available report." },
        { status: 400, headers: privateHeaders },
      );
    }
    let period: ReturnType<typeof parseReportPeriod>;
    try {
      period = parseReportPeriod(
        query.get("from") ?? "",
        query.get("to") ?? "",
      );
    } catch {
      return Response.json(
        {
          error:
            "Select valid start and end dates, with the start on or before the end.",
        },
        { status: 400, headers: privateHeaders },
      );
    }
    const file = await report.builder(getDatabase(), period);
    const body = file.bytes.buffer.slice(
      file.bytes.byteOffset,
      file.bytes.byteOffset + file.bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        ...privateHeaders,
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "The report could not be generated. Please try again." },
      { status: 500, headers: privateHeaders },
    );
  }
}
