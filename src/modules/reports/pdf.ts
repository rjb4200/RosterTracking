import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getDepartmentCalendarDate } from "@/modules/classes/time";
import type { MtuSummary } from "./mtu-summary";
import { printable, wrap } from "./pdf-utils";

const ink = rgb(0.12, 0.2, 0.27);
const teal = rgb(0.02, 0.38, 0.4);
const muted = rgb(0.37, 0.43, 0.48);
const pale = rgb(0.94, 0.96, 0.96);
const number = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });

export async function renderMtuSummaryPdf(
  summary: MtuSummary,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const start = getDepartmentCalendarDate(summary.period.from);
  const end = getDepartmentCalendarDate(
    new Date(summary.period.to.getTime() - 1),
  );
  const period = `${start} through ${end}`;
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
    page.drawText(printable(value, regular), {
      x,
      y: baseline,
      size,
      font: strong ? bold : regular,
      color,
    });
  };
  const header = () => {
    page.drawRectangle({ x: 0, y: 776, width: 612, height: 16, color: teal });
    text("ROSTER COMMAND / GRANT UTILIZATION", 42, 748, 9, true, teal);
    text("MTU Usage Summary", 42, 718, 25, true);
    text(period, 42, 697, 11, false, muted);
    y = 672;
  };
  const nextPage = () => {
    page = pdf.addPage([612, 792]);
    header();
  };
  header();
  const paragraph = (value: string, size = 9) => {
    for (const line of wrap(value, regular, size, 528)) {
      if (y < 64) nextPage();
      text(line, 42, y, size, false, muted);
      y -= size + 5;
    }
    y -= 6;
  };
  const metrics = [
    ["INSTRUCTOR HOURS", summary.totals.instructorHours],
    ["STUDENT HOURS", summary.totals.studentHours],
    ["STUDENT SIGN-INS", summary.totals.students],
    ["TRAINING SITES", summary.totals.sites],
  ] as const;
  for (const [index, [label, value]] of metrics.entries()) {
    const x = 42 + index * 134;
    page.drawRectangle({ x, y: y - 61, width: 126, height: 65, color: pale });
    text(label, x + 10, y - 12, 7, true, muted);
    text(number(value), x + 10, y - 43, 24, true, teal);
  }
  y -= 85;
  paragraph(
    `${summary.totals.classes} included classes. Live operational data, not frozen finalization revisions. Class date is the earliest component start in department local time.`,
  );
  paragraph(
    "Hours are credited component hours multiplied by instructors or active sign-ins. Students repeat across classes; sites count distinct non-null training sites. Supply estimates are identified below.",
  );
  if (!summary.totals.classes)
    paragraph("No MTU classes with active attendance match this period.");

  const table = (
    title: string,
    headings: string[],
    widths: number[],
    rows: string[][],
  ) => {
    const tableHeader = (continued = false) => {
      text(`${title}${continued ? " (continued)" : ""}`, 42, y, 13, true, teal);
      y -= 25;
      page.drawRectangle({
        x: 42,
        y: y - 7,
        width: 528,
        height: 22,
        color: ink,
      });
      let x = 49;
      headings.forEach((heading, index) => {
        text(heading, x, y, 8, true, rgb(1, 1, 1));
        x += widths[index] ?? 0;
      });
      y -= 23;
    };
    if (y < 145) nextPage();
    tableHeader();
    const data = rows.length
      ? rows
      : [
          [
            "No recorded items in this period.",
            ...headings.slice(1).map(() => ""),
          ],
        ];
    data.forEach((row, rowIndex) => {
      const cells = row.map((cell, index) =>
        wrap(cell, regular, 9, (widths[index] ?? 528) - 14),
      );
      const lineCount = Math.max(...cells.map((cell) => cell.length));
      // Split even an exceptionally long single row across pages; repeat the
      // section and column headings on every continuation page.
      for (let offset = 0; offset < lineCount; ) {
        if (y < 80) {
          nextPage();
          tableHeader(true);
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
    y -= 24;
  };
  table(
    "01 / Transportation",
    ["VEHICLE", "RECORDED MILES", "RECORD QUALITY"],
    [250, 105, 173],
    summary.transportation.map((item) => [
      item.name,
      number(item.miles),
      item.missingMileage
        ? `${item.missingMileage} of ${item.uses} uses missing mileage`
        : `${item.uses} class uses`,
    ]),
  );
  paragraph(
    "Vehicle totals sum recorded estimates only. Zero with missing mileage does not mean zero travel. Off-catalog mileage is preserved separately and is not added to numeric totals.",
  );
  table(
    "02 / Course List",
    ["COURSE / COMPONENTS", "DATE / LOCATION", "HOURS / PEOPLE"],
    [248, 170, 110],
    summary.classes.map((row) => [
      [
        row.name || "Untitled class",
        row.courseNumber,
        ...row.components.map((component) =>
          [component.trainingCode, component.title].filter(Boolean).join(" - "),
        ),
      ]
        .filter(Boolean)
        .join("; "),
      `${getDepartmentCalendarDate(row.classDate)}; ${row.siteName ?? "Online / no site"}; Host: ${row.hostAgency}`,
      `${number(row.hours)} hours; ${row.instructorCount} instructors; ${row.students.length} students; ${row.status}`,
    ]),
  );
  if (!summary.locations.length)
    table(
      "03 / Locations and Students",
      ["STUDENT", "COURSE / DATE", "AGENCY / ID"],
      [170, 190, 168],
      [],
    );
  for (const [index, location] of summary.locations.entries()) {
    if (y < 180) nextPage();
    paragraph(
      `${index === 0 ? "03 / Locations and Students: " : "Location: "}${location.name}${location.address ? ` - ${location.address}` : ""}`,
      10,
    );
    table(
      "Attendance",
      ["STUDENT", "COURSE / DATE", "AGENCY / ID"],
      [170, 190, 168],
      location.classes.flatMap((row) =>
        row.students.map((student) => [
          `${student.name}${student.guest ? " (guest)" : ""}`,
          `${row.name || "Untitled class"}; ${getDepartmentCalendarDate(row.classDate)}`,
          `${student.agency}${student.studentNumber ? `; #${student.studentNumber}` : ""}`,
        ]),
      ),
    );
  }
  table(
    "04 / Supplies",
    ["SUPPLY", "QUANTITY / UNIT", "RECORD QUALITY"],
    [250, 105, 173],
    summary.supplies.map((item) => [
      item.name,
      `${number(item.quantity)} ${item.unitLabel ?? ""}`,
      [
        item.estimatedClasses
          ? `${item.estimatedClasses} live estimates`
          : "Recorded quantities",
        item.missingQuantity
          ? `${item.missingQuantity} missing quantities`
          : null,
      ]
        .filter(Boolean)
        .join("; "),
    ]),
  );
  table(
    "05 / Equipment Use",
    ["EQUIPMENT", "CLASS USES"],
    [420, 108],
    summary.equipment.map((item) => [item.name, number(item.uses)]),
  );
  table(
    "06 / Off-Catalog Notes",
    ["COURSE / DATE", "RECORDED TEXT"],
    [180, 348],
    summary.classes.flatMap((row) => {
      const notes = [
        row.equipmentUsed ? `Equipment: ${row.equipmentUsed}` : null,
        row.mileage ? `Mileage: ${row.mileage}` : null,
        row.usedSupplies ? `Supplies: ${row.usedSupplies}` : null,
      ].filter(Boolean);
      return notes.length
        ? [
            [
              `${row.name || "Untitled class"}; ${getDepartmentCalendarDate(row.classDate)}`,
              notes.join("; "),
            ],
          ]
        : [];
    }),
  );
  const pages = pdf.getPages();
  for (const [index, current] of pages.entries()) {
    current.drawLine({
      start: { x: 42, y: 44 },
      end: { x: 570, y: 44 },
      thickness: 0.5,
      color: muted,
    });
    current.drawText(`MTU / ${period} / Page ${index + 1} of ${pages.length}`, {
      x: 42,
      y: 29,
      font: regular,
      size: 8,
      color: muted,
    });
  }
  pdf.setTitle("MTU Usage Summary");
  pdf.setAuthor("Roster Command");
  pdf.setSubject(`Grant utilization / ${period}`);
  return pdf.save();
}
