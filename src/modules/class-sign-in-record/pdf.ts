import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { ATTENDANCE_ATTESTATION_VERSION } from "@/modules/student-sign-in/attendance";

export interface ClassSignInRecordEntry {
  attendanceId: string;
  participantName: string;
  participantType: "regular" | "guest";
  agencyName: string;
  signInMethod: string;
  creditedHours: string;
  signedInAt: Date;
  attestation: {
    renderedText: string;
    textVersion: number;
    confirmedAt: Date;
    originatingIp: string;
    rememberedDeviceId: string | null;
  } | null;
}

export interface ClassSignInRecordRemovedEntry extends ClassSignInRecordEntry {
  removedAt: Date;
  removedBy: string;
  removalReason: string;
}

export interface ClassSignInRecord {
  classId: string;
  courseName: string;
  siteName: string | null;
  hostAgencyName: string;
  deliveryMethod: string;
  generatedAt: Date;
  active: ClassSignInRecordEntry[];
  removed: ClassSignInRecordRemovedEntry[];
}

export const SIGN_IN_RECORD_ATTESTATION_VERSION =
  ATTENDANCE_ATTESTATION_VERSION;

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const LINE_HEIGHT = 14;
const HEADER_LINES = 6;
// Vertical room left for entry blocks after the page header and its spacing.
const BODY_HEIGHT =
  PAGE_HEIGHT - MARGIN * 2 - HEADER_LINES * LINE_HEIGHT - LINE_HEIGHT / 2;

function safeText(value: string): string {
  // pdf-lib's standard fonts are WinAnsi; replace unsupported glyphs so a
  // stray character cannot fail the whole record.
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
}

function formatDepartmentDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.DEPARTMENT_TIME_ZONE ?? "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface EntryLine {
  text: string;
  size: number;
  bold: boolean;
}

type SignInRow =
  | { kind: "active"; entry: ClassSignInRecordEntry }
  | { kind: "removed"; entry: ClassSignInRecordRemovedEntry };

function entryLines(row: SignInRow): EntryLine[] {
  const entry = row.entry;
  const suffix = row.kind === "removed" ? " (REMOVED)" : "";
  const lines: EntryLine[] = [
    { text: `${entry.participantName}${suffix}`, size: 11, bold: true },
    {
      text: `  ${entry.participantType} | ${entry.agencyName} | ${entry.signInMethod} | ${entry.creditedHours} hours`,
      size: 9,
      bold: false,
    },
  ];
  if (entry.attestation) {
    lines.push({
      text: `  Confirmed ${formatDepartmentDateTime(entry.attestation.confirmedAt)}`,
      size: 9,
      bold: false,
    });
    for (const wrapped of wrap(entry.attestation.renderedText, 92)) {
      lines.push({ text: `  "${wrapped}"`, size: 9, bold: false });
    }
    lines.push({
      text: `  Attestation v${entry.attestation.textVersion} | IP ${entry.attestation.originatingIp} | Device ${entry.attestation.rememberedDeviceId ?? "none"}`,
      size: 9,
      bold: false,
    });
  } else {
    lines.push({ text: "  No attestation recorded.", size: 9, bold: false });
  }
  if (row.kind === "removed") {
    lines.push({
      text: `  Removed ${formatDepartmentDateTime(row.entry.removedAt)} by ${row.entry.removedBy}: ${row.entry.removalReason}`,
      size: 9,
      bold: false,
    });
  }
  return lines;
}

export async function renderClassSignInRecordPdf(
  record: ClassSignInRecord,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const rows: SignInRow[] = [
    ...record.active.map((entry) => ({ kind: "active" as const, entry })),
    ...record.removed.map((entry) => ({ kind: "removed" as const, entry })),
  ];

  // Pack entries onto pages by their real rendered height so a class of any
  // size flows onto additional pages instead of running off the bottom.
  const pageGroups: SignInRow[][] = [];
  let current: SignInRow[] = [];
  let usedHeight = 0;
  for (const row of rows) {
    const entryHeight = entryLines(row).length * LINE_HEIGHT + LINE_HEIGHT / 2;
    if (current.length > 0 && usedHeight + entryHeight > BODY_HEIGHT) {
      pageGroups.push(current);
      current = [];
      usedHeight = 0;
    }
    current.push(row);
    usedHeight += entryHeight;
  }
  pageGroups.push(current);

  pageGroups.forEach((group, pageIndex) => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    const line = (text: string, size = 10, useBold = false) => {
      page.drawText(safeText(text), {
        x: MARGIN,
        y,
        size,
        font: useBold ? bold : font,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT;
    };

    line("Class sign-in record", 16, true);
    line(`${record.courseName}`, 12, true);
    line(
      `Location: ${record.siteName ?? "Online"}   Delivery: ${record.deliveryMethod.replace("_", " ")}`,
    );
    line(`Host agency: ${record.hostAgencyName}`);
    line(
      `Generated: ${formatDepartmentDateTime(record.generatedAt)}   Page ${pageIndex + 1} of ${pageGroups.length}`,
    );
    line(`Active: ${record.active.length}   Removed: ${record.removed.length}`);
    y -= LINE_HEIGHT / 2;

    if (group.length === 0) {
      line("No attendance has been recorded for this class.");
    }

    for (const row of group) {
      for (const entryLine of entryLines(row)) {
        line(entryLine.text, entryLine.size, entryLine.bold);
      }
      y -= LINE_HEIGHT / 2;
    }
  });

  pdf.setCreationDate(new Date(0));
  pdf.setModificationDate(new Date(0));
  pdf.setCreator("Roster Command");
  pdf.setProducer("Roster Command");
  pdf.setTitle("Class sign-in record");
  return pdf.save({ useObjectStreams: false });
}
