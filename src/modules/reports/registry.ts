import "server-only";

import { getDepartmentCalendarDate } from "@/modules/classes/time";
import type { Database } from "@/server/db/client";
import { reportCatalog } from "./catalog";
import { aggregateMtuSummary } from "./mtu-summary";
import { renderMtuSummaryPdf } from "./pdf";
import { type ReportPeriod, validateReportPeriod } from "./period";
import { queryMtuSummary } from "./query";

export interface ReportFile {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
}

export async function buildMtuUsageSummary(
  db: Database,
  period: ReportPeriod,
): Promise<ReportFile> {
  validateReportPeriod(period);
  const rows = await queryMtuSummary(db, period);
  return {
    bytes: await renderMtuSummaryPdf(aggregateMtuSummary(rows, period)),
    filename: `mtu-usage-summary_${getDepartmentCalendarDate(period.from)}_${getDepartmentCalendarDate(new Date(period.to.getTime() - 1))}.pdf`,
    contentType: "application/pdf",
  };
}

export const reports = [
  { ...reportCatalog[0], builder: buildMtuUsageSummary },
] as const;

export function getReport(id: string) {
  return reports.find((report) => report.id === id);
}
