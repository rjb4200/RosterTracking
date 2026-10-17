import "server-only";

import { PDFDocument } from "pdf-lib";
import { getDepartmentCalendarDate } from "@/modules/classes/time";
import {
  renderCertificatePage,
  revisionReportsToKbems,
} from "@/modules/completion-certificates/service";
import {
  type OfficialRosterActor,
  readSnapshot,
} from "@/modules/official-roster-pdfs/service";
import { getAgency, getSite, getStudent } from "@/modules/reference/services";
import type { Database } from "@/server/db/client";
import { type ReportInputKind, reportCatalog } from "./catalog";
import { buildActivityReport } from "./ce-activity";
import { renderCeReportPdf } from "./ce-pdf";
import {
  queryAgencyActivity,
  querySiteActivity,
  queryStudentTranscript,
} from "./ce-query";
import {
  buildStudentTranscript,
  type StudentTranscript,
} from "./ce-transcript";
import { aggregateMtuSummary } from "./mtu-summary";
import { renderMtuSummaryPdf } from "./pdf";
import { type ReportPeriod, validateReportPeriod } from "./period";
import { queryMtuSummary } from "./query";

export interface ReportFile {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
}

/** Per-report inputs supplied by the Reports workspace beyond the period. */
export interface ReportParams {
  studentId?: string;
  agencyId?: string;
  siteId?: string;
  /** Bundle each included class's completion certificate after the transcript. */
  withCertificates?: boolean;
  /** The requesting staff member, used for certificate authority checks. */
  actor?: OfficialRosterActor;
}

export interface ReportDefinition {
  id: string;
  label: string;
  description: string;
  /** The extra input this report needs, or null when a period is enough. */
  input: ReportInputKind | null;
  build(
    db: Database,
    period: ReportPeriod,
    params: ReportParams,
  ): Promise<ReportFile>;
}

const number = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });

function requireParam(value: string | undefined, kind: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`Select a ${kind}.`);
  return trimmed;
}

function periodLabel(period: ReportPeriod): string {
  return `${getDepartmentCalendarDate(period.from)} through ${getDepartmentCalendarDate(
    new Date(period.to.getTime() - 1),
  )}`;
}

function periodFileStamp(period: ReportPeriod): string {
  return `${getDepartmentCalendarDate(period.from)}_${getDepartmentCalendarDate(
    new Date(period.to.getTime() - 1),
  )}`;
}

/** Whole days until the period's exclusive end, or null once it has passed. */
function daysToPeriodEnd(period: ReportPeriod): number | null {
  const diff = Math.ceil((period.to.getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? diff : null;
}

function slug(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return cleaned || "student";
}

const CE_NOTE =
  "Reference only: hours reflect the category recorded at class creation; a course may satisfy additional KBEMS content. Pediatric hours are shown in the requirements above and are not tracked against this log.";

export async function buildMtuUsageSummary(
  db: Database,
  period: ReportPeriod,
): Promise<ReportFile> {
  validateReportPeriod(period);
  const rows = await queryMtuSummary(db, period);
  return {
    bytes: await renderMtuSummaryPdf(aggregateMtuSummary(rows, period)),
    filename: `mtu-usage-summary_${periodFileStamp(period)}.pdf`,
    contentType: "application/pdf",
  };
}

/** Appends each included class's certificate, skipping classes without one. */
async function appendCertificates(
  db: Database,
  actor: OfficialRosterActor | undefined,
  transcript: StudentTranscript,
  baseBytes: Uint8Array,
): Promise<Uint8Array> {
  if (!actor) return baseBytes;
  const output = await PDFDocument.load(baseBytes);
  let added = 0;
  for (const row of transcript.rows) {
    if (!row.revisionId) continue;
    let snapshot: Awaited<ReturnType<typeof readSnapshot>>;
    try {
      snapshot = await readSnapshot(db, actor, row.revisionId);
    } catch {
      continue;
    }
    if (!revisionReportsToKbems(snapshot)) continue;
    const participant = snapshot.attendance.find(
      (entry) => entry.attendanceId === row.attendanceId,
    );
    if (!participant) continue;
    const page = await renderCertificatePage(snapshot, participant);
    const [copied] = await output.copyPages(page, [0]);
    output.addPage(copied);
    added += 1;
  }
  return added ? output.save() : baseBytes;
}

async function buildStudentTranscriptReport(
  db: Database,
  period: ReportPeriod,
  params: ReportParams,
): Promise<ReportFile> {
  validateReportPeriod(period);
  const studentId = requireParam(params.studentId, "student");
  const student = await getStudent(db, studentId);
  if (!student) throw new Error("Select a student.");
  const sourceRows = await queryStudentTranscript(db, period, studentId);
  const transcript = buildStudentTranscript(sourceRows, period);
  const kemsis = student.credentials.find(
    (credential) => credential.credentialTypeCode === "kemsis",
  );
  const subtitle = [
    `${student.firstName} ${student.lastName}`.trim(),
    kemsis ? `KEMSIS ${kemsis.maskedSuffix}` : null,
    student.studentNumber ? `Student #${student.studentNumber}` : null,
  ]
    .filter(Boolean)
    .join("  -  ");
  const transcriptBytes = await renderCeReportPdf({
    title: "KBEMS CE - Training Delivered",
    subtitle,
    period: periodLabel(period),
    daysRemaining: daysToPeriodEnd(period),
    columns: [
      { heading: "DATE", width: 78 },
      { heading: "COURSE", width: 240 },
      { heading: "CATEGORY", width: 130 },
      { heading: "HOURS", width: 80 },
    ],
    rows: transcript.rows.map((row) => [
      getDepartmentCalendarDate(row.date),
      row.course,
      row.category,
      number(row.hours),
    ]),
    totalLine: `TOTAL DELIVERED: ${number(transcript.totalHours)} hours`,
    note: CE_NOTE,
  });
  const baseFilename = `ce-transcript_${slug(student.lastName)}_${periodFileStamp(period)}`;
  if (params.withCertificates) {
    const bytes = await appendCertificates(
      db,
      params.actor,
      transcript,
      transcriptBytes,
    );
    return {
      bytes,
      filename: `${baseFilename}_with-certificates.pdf`,
      contentType: "application/pdf",
    };
  }
  return {
    bytes: transcriptBytes,
    filename: `${baseFilename}.pdf`,
    contentType: "application/pdf",
  };
}

async function buildAgencyActivityReport(
  db: Database,
  period: ReportPeriod,
  params: ReportParams,
): Promise<ReportFile> {
  validateReportPeriod(period);
  const agencyId = requireParam(params.agencyId, "agency");
  const agency = await getAgency(db, agencyId);
  if (!agency) throw new Error("Select an agency.");
  const report = buildActivityReport(
    await queryAgencyActivity(db, period, agencyId),
    period,
  );
  return {
    bytes: await renderCeReportPdf({
      title: "Training Delivered - Agency",
      subtitle: agency.name,
      period: periodLabel(period),
      daysRemaining: daysToPeriodEnd(period),
      columns: [
        { heading: "DATE", width: 74 },
        { heading: "COURSE", width: 196 },
        { heading: "CATEGORY", width: 108 },
        { heading: "HOURS", width: 58 },
        { heading: "ATTENDEES", width: 92 },
      ],
      rows: report.rows.map((row) => [
        getDepartmentCalendarDate(row.date),
        row.course,
        row.category,
        number(row.hours),
        String(row.attendees.length),
      ]),
      totalLine: `${report.rows.length} classes  -  ${number(report.totalHours)} hours  -  ${report.totalAttendees} attendances`,
      note: CE_NOTE,
    }),
    filename: `agency-training_${slug(agency.name)}_${periodFileStamp(period)}.pdf`,
    contentType: "application/pdf",
  };
}

async function buildSiteActivityReport(
  db: Database,
  period: ReportPeriod,
  params: ReportParams,
): Promise<ReportFile> {
  validateReportPeriod(period);
  const siteId = requireParam(params.siteId, "training site");
  const site = await getSite(db, siteId);
  if (!site) throw new Error("Select a training site.");
  const report = buildActivityReport(
    await querySiteActivity(db, period, siteId),
    period,
  );
  return {
    bytes: await renderCeReportPdf({
      title: "Training Delivered - Training Site",
      subtitle: site.name,
      period: periodLabel(period),
      daysRemaining: daysToPeriodEnd(period),
      columns: [
        { heading: "DATE", width: 74 },
        { heading: "COURSE", width: 196 },
        { heading: "CATEGORY", width: 108 },
        { heading: "HOURS", width: 58 },
        { heading: "ATTENDEES", width: 92 },
      ],
      rows: report.rows.map((row) => [
        getDepartmentCalendarDate(row.date),
        row.course,
        row.category,
        number(row.hours),
        String(row.attendees.length),
      ]),
      totalLine: `${report.rows.length} classes  -  ${number(report.totalHours)} hours  -  ${report.totalAttendees} attendances`,
      note: CE_NOTE,
    }),
    filename: `site-training_${slug(site.name)}_${periodFileStamp(period)}.pdf`,
    contentType: "application/pdf",
  };
}

export const reports: ReportDefinition[] = [
  { ...reportCatalog[0], build: buildMtuUsageSummary },
  { ...reportCatalog[1], build: buildStudentTranscriptReport },
  { ...reportCatalog[2], build: buildAgencyActivityReport },
  { ...reportCatalog[3], build: buildSiteActivityReport },
];

export function getReport(id: string): ReportDefinition | undefined {
  return reports.find((report) => report.id === id);
}
