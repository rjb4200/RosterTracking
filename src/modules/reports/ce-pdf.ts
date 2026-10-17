import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  CE_REQUIREMENT_LEVELS,
  CE_REQUIREMENT_ROWS,
  CE_TOTAL_ROW,
} from "./ce-requirements";
import { printable, wrap } from "./pdf-utils";

const ink = rgb(0.12, 0.2, 0.27);
const teal = rgb(0.02, 0.38, 0.4);
const muted = rgb(0.37, 0.43, 0.48);
const pale = rgb(0.94, 0.96, 0.96);
const white = rgb(1, 1, 1);
const warn = rgb(0.66, 0.16, 0.16);

const number = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });

export interface CeReportPdfInput {
  title: string;
  subtitle: string;
  period: string;
  daysRemaining: number | null;
  columns: { heading: string; width: number }[];
  rows: string[][];
  totalLine: string;
  note: string;
}

/**
 * Renders a "training delivered" PDF: a header, the shared KBEMS requirements
 * reference block (same on every training-delivered report), a flat table, and
 * a total line. No completed-vs-required computation is performed: the table
 * lists what was delivered, and the block is a reference for the reader.
 */
export async function renderCeReportPdf(
  input: CeReportPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 0;
  const text = (
    value: string,
    x: number,
    baseline: number,
    size = 9,
    strong = false,
    color = ink,
  ) => {
    page.drawText(printable(value, strong ? bold : regular), {
      x,
      y: baseline,
      size,
      font: strong ? bold : regular,
      color,
    });
  };
  const header = () => {
    page.drawRectangle({ x: 0, y: 776, width: 612, height: 16, color: teal });
    text("ROSTER COMMAND / TRAINING DELIVERED", 42, 748, 9, true, teal);
    text(input.title, 42, 716, 22, true);
    text(input.subtitle, 42, 697, 11, false, muted);
    text(
      `Period: ${input.period}${input.daysRemaining !== null ? `  -  ${input.daysRemaining} days to period end` : ""}`,
      42,
      682,
      9,
      false,
      muted,
    );
    y = 658;
  };
  const nextPage = () => {
    page = pdf.addPage([612, 792]);
    header();
  };
  header();
  const drawRequirementsBlock = () => {
    // A solid banner so the reference table can never be mistaken for the
    // student's completed hours.
    page.drawRectangle({
      x: 42,
      y: y - 4,
      width: 528,
      height: 16,
      color: teal,
    });
    text(
      "KBEMS REQUIREMENT HOURS BY LEVEL   -   REFERENCE ONLY",
      49,
      y,
      8,
      true,
      white,
    );
    y -= 22;
    text(
      "Reference only: required hours per level, NOT this student's completed or credited hours.",
      42,
      y,
      7,
      true,
      warn,
    );
    y -= 15;
    const categoryWidth = 156;
    const levelWidth = (528 - categoryWidth) / CE_REQUIREMENT_LEVELS.length;
    const widths = [
      categoryWidth,
      ...CE_REQUIREMENT_LEVELS.map(() => levelWidth),
    ];
    const rowHeight = 14;
    page.drawRectangle({ x: 42, y: y - 5, width: 528, height: 15, color: ink });
    let x = 49;
    ["Category", ...CE_REQUIREMENT_LEVELS].forEach((heading, index) => {
      text(heading, x, y, 7, true, white);
      x += widths[index] ?? 0;
    });
    y -= 16;
    const drawRow = (
      entry: (typeof CE_REQUIREMENT_ROWS)[number],
      strong = false,
    ) => {
      if (strong)
        page.drawRectangle({
          x: 42,
          y: y - 4,
          width: 528,
          height: rowHeight,
          color: pale,
        });
      let cx = 49;
      [
        entry.category,
        ...CE_REQUIREMENT_LEVELS.map((level) => number(entry.hours[level])),
      ].forEach((cell, index) => {
        text(cell, cx, y, 8, strong);
        cx += widths[index] ?? 0;
      });
      y -= rowHeight;
    };
    for (const entry of CE_REQUIREMENT_ROWS) drawRow(entry);
    drawRow(CE_TOTAL_ROW, true);
    y -= 8;
  };
  drawRequirementsBlock();

  for (const line of wrap(input.note, regular, 8, 528)) {
    if (y < 64) nextPage();
    text(line, 42, y, 8, false, muted);
    y -= 12;
  }
  y -= 10;

  const widths = input.columns.map((column) => column.width);
  const tableHeader = () => {
    text("TRAINING DELIVERED IN THIS PERIOD", 42, y, 12, true, teal);
    y -= 22;
    page.drawRectangle({ x: 42, y: y - 7, width: 528, height: 22, color: ink });
    let x = 49;
    input.columns.forEach((column, index) => {
      text(column.heading, x, y, 8, true, white);
      x += widths[index] ?? 0;
    });
    y -= 23;
  };
  tableHeader();
  const data = input.rows.length
    ? input.rows
    : [
        [
          "No training delivered in this period.",
          ...input.columns.slice(1).map(() => ""),
        ],
      ];
  data.forEach((row, rowIndex) => {
    const cells = row.map((cell, index) =>
      wrap(cell, regular, 9, (widths[index] ?? 528) - 14),
    );
    const lineCount = Math.max(...cells.map((cell) => cell.length));
    for (let offset = 0; offset < lineCount; ) {
      if (y < 80) {
        nextPage();
        tableHeader();
      }
      const count = Math.min(lineCount - offset, Math.floor((y - 64) / 13));
      const height = count * 13 + 9;
      if (rowIndex % 2 === 0)
        page.drawRectangle({
          x: 42,
          y: y - height + 10,
          width: 528,
          height,
          color: pale,
        });
      let x = 49;
      cells.forEach((cell, index) => {
        cell.slice(offset, offset + count).forEach((line, lineIndex) => {
          text(line, x, y - lineIndex * 13);
        });
        x += widths[index] ?? 0;
      });
      y -= height;
      offset += count;
    }
  });
  y -= 12;
  if (y < 80) nextPage();
  page.drawRectangle({ x: 42, y: y - 6, width: 528, height: 20, color: ink });
  text(input.totalLine, 49, y, 10, true, white);
  y -= 24;

  const pages = pdf.getPages();
  for (const [index, current] of pages.entries()) {
    current.drawLine({
      start: { x: 42, y: 44 },
      end: { x: 570, y: 44 },
      thickness: 0.5,
      color: muted,
    });
    current.drawText(
      `KBEMS CE / ${input.period} / Page ${index + 1} of ${pages.length}`,
      { x: 42, y: 29, font: regular, size: 8, color: muted },
    );
  }
  pdf.setTitle(input.title);
  pdf.setAuthor("Roster Command");
  pdf.setSubject(`Training delivered / ${input.period}`);
  return pdf.save();
}
