import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_CATEGORY_ORDER,
  auditCategory,
  describeAuditEntry,
} from "./labels";
import type { ClassAuditLog } from "./service";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const LINE_HEIGHT = 14;
const HEADER_LINES = 6;
const BODY_CAPACITY =
  Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT) - HEADER_LINES;

interface RenderLine {
  text: string;
  size: number;
  bold: boolean;
}

function safeText(value: string): string {
  // pdf-lib's standard fonts are WinAnsi; replace unsupported glyphs so a
  // stray character cannot fail the whole log.
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00b7/g, "-");
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

function buildLines(log: ClassAuditLog): RenderLine[] {
  const sections = AUDIT_CATEGORY_ORDER.map((category) => ({
    label: AUDIT_CATEGORY_LABELS[category],
    entries: log.entries.filter(
      (entry) => auditCategory(entry.action) === category,
    ),
  })).filter((section) => section.entries.length > 0);

  if (sections.length === 0) {
    return [
      {
        text: "No audit events have been recorded for this class.",
        size: 10,
        bold: false,
      },
    ];
  }

  const lines: RenderLine[] = [];
  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) lines.push({ text: "", size: 10, bold: false });
    lines.push({ text: section.label, size: 12, bold: true });
    for (const entry of section.entries) {
      lines.push({
        text: `${formatDepartmentDateTime(entry.occurredAt)}  -  ${entry.actorName}`,
        size: 9,
        bold: true,
      });
      for (const wrapped of wrap(describeAuditEntry(entry), 90)) {
        lines.push({ text: `   ${wrapped}`, size: 10, bold: false });
      }
      if (entry.ipAddress) {
        lines.push({ text: `   IP ${entry.ipAddress}`, size: 8, bold: false });
      }
    }
  });
  return lines;
}

export async function renderClassAuditLogPdf(
  log: ClassAuditLog,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const lines = buildLines(log);
  const pageGroups: RenderLine[][] = [];
  for (let index = 0; index < lines.length; index += BODY_CAPACITY) {
    pageGroups.push(lines.slice(index, index + BODY_CAPACITY));
  }
  if (pageGroups.length === 0) pageGroups.push([]);

  pageGroups.forEach((group, pageIndex) => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    const line = (text: string, size = 10, useBold = false) => {
      if (text) {
        page.drawText(safeText(text), {
          x: MARGIN,
          y,
          size,
          font: useBold ? bold : font,
          color: rgb(0, 0, 0),
        });
      }
      y -= LINE_HEIGHT;
    };

    line("Class audit log", 16, true);
    line(log.className || "Class", 12, true);
    line(`Location: ${log.siteName ?? "Online"}`);
    line(`Status: ${log.status}`);
    line(
      `Generated: ${formatDepartmentDateTime(log.generatedAt)}   Page ${pageIndex + 1} of ${pageGroups.length}`,
    );
    y -= LINE_HEIGHT / 2;

    for (const renderLine of group) {
      line(renderLine.text, renderLine.size, renderLine.bold);
    }
  });

  pdf.setCreationDate(new Date(0));
  pdf.setModificationDate(new Date(0));
  pdf.setCreator("Roster Command");
  pdf.setProducer("Roster Command");
  pdf.setTitle("Class audit log");
  return pdf.save({ useObjectStreams: false });
}
