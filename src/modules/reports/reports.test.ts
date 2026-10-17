import { PgDialect } from "drizzle-orm/pg-core";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { parseDepartmentDateTime } from "@/modules/classes/time";
import type { Database } from "@/server/db/client";
import { reportCatalog } from "./catalog";
import {
  aggregateMtuSummary,
  isReportClassInPeriod,
  type ReportClass,
} from "./mtu-summary";
import { renderMtuSummaryPdf } from "./pdf";
import { parseReportPeriod, validateReportPeriod } from "./period";
import { mtuSummaryQuery, queryMtuSummary } from "./query";
import { getReport } from "./registry";

const period = parseReportPeriod("2026-03-01", "2026-03-31");
function fixture(overrides: Partial<ReportClass> = {}): ReportClass {
  return {
    id: "class-a",
    name: "Emergency Care",
    status: "open",
    mtuSelected: true,
    siteId: "site-a",
    siteName: "Training Center",
    siteAddress: "100 Main St",
    hostAgency: "Fire Department",
    courseNumber: "EMS-101",
    instructorCount: 2,
    components: [
      {
        startsAt: "2026-03-05T14:00:00Z",
        creditedHours: 2,
        title: "Airway",
        trainingCode: "101",
      },
      {
        startsAt: "2026-03-06T14:00:00Z",
        creditedHours: 3,
        title: "Trauma",
        trainingCode: "102",
      },
    ],
    students: [
      {
        attendanceId: "a",
        name: "Alex Student",
        studentNumber: "100",
        agency: "Fire Department",
        guest: false,
        removedAt: null,
      },
      {
        attendanceId: "b",
        name: "Guest Learner",
        studentNumber: null,
        agency: "EMS",
        guest: true,
        removedAt: null,
      },
      {
        attendanceId: "c",
        name: "Removed Student",
        studentNumber: null,
        agency: "EMS",
        guest: false,
        removedAt: "2026-03-06T15:00:00Z",
      },
    ],
    items: [],
    equipmentUsed: null,
    mileage: null,
    usedSupplies: null,
    ...overrides,
  };
}
function item(
  overrides: Partial<ReportClass["items"][number]> = {},
): ReportClass["items"][number] {
  return {
    itemId: "van-id",
    name: "Ford Transit Van 15 passenger",
    kind: "transport",
    unitLabel: null,
    quantity: null,
    mileage: null,
    source: "manual",
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    ...overrides,
  };
}

describe("report periods", () => {
  it("includes both selected local calendar days, respecting daylight saving", () => {
    const day = parseReportPeriod("2026-03-08", "2026-03-08");
    expect(day.from).toEqual(parseDepartmentDateTime("2026-03-08T00:00"));
    expect(day.to).toEqual(parseDepartmentDateTime("2026-03-09T00:00"));
    expect(day.to.getTime() - day.from.getTime()).toBe(23 * 60 * 60 * 1000);
    const fall = parseReportPeriod("2026-11-01", "2026-11-01");
    expect(fall.to.getTime() - fall.from.getTime()).toBe(25 * 60 * 60 * 1000);
  });
  it.each([
    ["", "2026-03-01"],
    ["2026-02-30", "2026-03-01"],
    ["2026-03-02", "2026-03-01"],
    ["2026-3-01", "2026-03-31"],
    ["2026-01-01T00:00Z", "2026-03-31"],
  ])("rejects invalid input %s / %s", (from, to) => {
    expect(() => parseReportPeriod(from, to)).toThrow();
  });
  it("rejects invalid or empty instant ranges", () => {
    expect(() =>
      validateReportPeriod({ from: new Date("bad"), to: period.to }),
    ).toThrow();
    expect(() =>
      validateReportPeriod({ from: period.from, to: period.from }),
    ).toThrow();
  });
});

describe("MTU scope and totals", () => {
  it.each(["draft", "open", "finalized"])("includes %s classes", (status) => {
    expect(isReportClassInPeriod(fixture({ status }), period)).toBe(true);
  });
  it("requires MTU, a schedule, noncancelled status and active attendance", () => {
    for (const overrides of [
      { mtuSelected: false },
      { status: "cancelled" },
      { components: [] },
      { students: [] },
      { students: fixture().students.filter((s) => s.removedAt) },
    ])
      expect(isReportClassInPeriod(fixture(overrides), period)).toBe(false);
  });
  it("uses the earliest component, not a later matching component", () => {
    const row = fixture();
    row.components.push({
      creditedHours: 1,
      title: "Earlier component",
      trainingCode: null,
      startsAt: "2026-02-28T14:00:00Z",
    });
    expect(isReportClassInPeriod(row, period)).toBe(false);
  });
  it("includes the lower bound but excludes the upper bound", () => {
    const row = fixture();
    row.components = [
      {
        creditedHours: 1,
        title: null,
        trainingCode: null,
        startsAt: period.from.toISOString(),
      },
    ];
    expect(isReportClassInPeriod(row, period)).toBe(true);
    row.components = row.components.map((component) => ({
      ...component,
      startsAt: period.to.toISOString(),
    }));
    expect(isReportClassInPeriod(row, period)).toBe(false);
  });
  it("multiplies component hours by people without fanout, repeats students and deduplicates non-null sites", () => {
    const input = [
      fixture(),
      fixture({ id: "b" }),
      fixture({ id: "c", siteId: null, siteName: null }),
    ];
    const result = aggregateMtuSummary(input, period);
    expect(result.totals).toEqual({
      classes: 3,
      instructorHours: 30,
      studentHours: 30,
      students: 6,
      sites: 1,
    });
    expect(result.locations).toHaveLength(2);
    expect(result.classes[0]?.students.map((student) => student.name)).toEqual([
      "Alex Student",
      "Guest Learner",
    ]);
    expect(input[0]?.students).toHaveLength(3);
  });
  it("keeps empty totals and the three zero transport lines", () => {
    const summary = aggregateMtuSummary([], period);
    expect(summary.totals).toEqual({
      classes: 0,
      instructorHours: 0,
      studentHours: 0,
      students: 0,
      sites: 0,
    });
    expect(summary.transportation).toHaveLength(3);
    expect(
      summary.transportation.every(
        (line) => line.miles === 0 && line.uses === 0,
      ),
    ).toBe(true);
    expect(summary.locations).toEqual([]);
    expect(summary.supplies).toEqual([]);
    expect(summary.equipment).toEqual([]);
  });
});

describe("catalog aggregation", () => {
  it("sums each transport independently and annotates unknown mileage", () => {
    const rows = [
      fixture({
        items: [
          item({ mileage: 12.25 }),
          item({ itemId: "pov", name: "POV", mileage: 7 }),
          item({ itemId: "dept", name: "Department vehicle", mileage: 4 }),
        ],
      }),
      fixture({
        id: "b",
        items: [item({ mileage: 0 }), item({ itemId: "pov", name: "POV" })],
      }),
      fixture({
        id: "c",
        items: [
          item({ mileage: 3.5 }),
          item({ itemId: "extra", name: "New vehicle", mileage: 20 }),
        ],
      }),
    ];
    const result = aggregateMtuSummary(rows, period);
    expect(
      result.transportation.find((line) => line.itemId === "van-id"),
    ).toMatchObject({ miles: 15.75, uses: 3, missingMileage: 0 });
    expect(
      result.transportation.find((line) => line.itemId === "pov"),
    ).toMatchObject({ miles: 7, uses: 2, missingMileage: 1 });
    expect(
      result.transportation.find((line) => line.itemId === "extra")?.miles,
    ).toBe(20);
    expect(
      result.transportation.find((line) => line.itemId === "dept")?.miles,
    ).toBe(4);
  });
  it("never guesses a renamed vehicle's identity or merges distinct IDs by name", () => {
    const result = aggregateMtuSummary(
      [
        fixture({
          items: [
            item({ name: "Renamed van", mileage: 9 }),
            item({ itemId: "different", mileage: 6 }),
          ],
        }),
      ],
      period,
    );
    expect(
      result.transportation.find((line) => line.itemId === "van-id")?.miles,
    ).toBe(9);
    expect(
      result.transportation.find((line) => line.itemId === "different")?.miles,
    ).toBe(6);
  });
  it("recomputes open suggestions, preserves manual/finalized values, and counts equipment per class", () => {
    const supply = item({
      itemId: "supply",
      name: "Bandages",
      kind: "supplies",
      unitLabel: "each",
      source: "suggested",
      quantity: 99,
      perClassQty: 1,
      perStudentQty: 0.75,
      rounding: "ceil",
    });
    const equipment = item({
      itemId: "equipment",
      kind: "equipment",
      name: "Mannequin",
    });
    const result = aggregateMtuSummary(
      [
        fixture({
          items: [supply, equipment],
          equipmentUsed: "Custom trainer",
          mileage: "about forty miles",
          usedSupplies: "Tape",
        }),
        fixture({
          id: "b",
          status: "finalized",
          items: [{ ...supply, quantity: 4 }, equipment],
        }),
        fixture({
          id: "c",
          items: [{ ...supply, source: "manual", quantity: 0 }],
        }),
        fixture({
          id: "d",
          items: [{ ...supply, source: "manual", quantity: null }],
        }),
      ],
      period,
    );
    expect(result.supplies[0]).toMatchObject({
      quantity: 7,
      estimatedClasses: 1,
      missingQuantity: 1,
    });
    expect(result.equipment[0]?.uses).toBe(2);
    expect(result.classes.find((row) => row.id === "class-a")).toMatchObject({
      equipmentUsed: "Custom trainer",
      mileage: "about forty miles",
      usedSupplies: "Tape",
    });
  });
});

describe("live query and registry", () => {
  it("parameterizes a half-open scope with independent relation aggregation", () => {
    const query = new PgDialect().sqlToQuery(mtuSummaryQuery(period));
    expect(query.params).toEqual([
      period.from.toISOString(),
      period.to.toISOString(),
    ]);
    expect(query.sql).toContain("min(cc.starts_at)");
    expect(query.sql).toContain("c.status <> 'cancelled'");
    expect(query.sql).toContain("a.removed_at is null");
    expect(query.sql).toContain("rs.code = 'mtu'");
    expect(query.sql).toContain("u.mileage::float8");
    expect(query.sql).not.toContain("a.credited_hours");
    expect(query.sql).not.toContain("finalization");
  });
  it("queries once and exposes the agreed builder/download contract", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [fixture()] });
    const db = { execute } as unknown as Database;
    expect(await queryMtuSummary(db, period)).toHaveLength(1);
    execute.mockClear();
    const report = getReport("mtu-usage-summary");
    expect(report?.label).toBe(reportCatalog[0].label);
    expect(getReport("unknown")).toBeUndefined();
    const file = await report?.build(db, period, {});
    expect(execute).toHaveBeenCalledTimes(1);
    expect(file?.bytes).toBeInstanceOf(Uint8Array);
    expect(file?.filename).toBe("mtu-usage-summary_2026-03-01_2026-03-31.pdf");
    expect(file?.contentType).toBe("application/pdf");
  });
});

describe("PDF rendering", () => {
  it("produces a readable empty report with document metadata", async () => {
    const bytes = await renderMtuSummaryPdf(aggregateMtuSummary([], period));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const document = await PDFDocument.load(bytes);
    expect(document.getTitle()).toBe("MTU Usage Summary");
    expect(document.getPageCount()).toBeGreaterThan(0);
    for (const page of document.getPages())
      expect(page.getSize()).toEqual({ width: 612, height: 792 });
  });
  it("paginates a large roster and safely wraps long and unsupported text", async () => {
    const row = fixture({
      name: "Long course ".repeat(4),
      equipmentUsed: "X".repeat(40000),
      students: Array.from({ length: 180 }, (_, index) => ({
        studentNumber: null,
        agency: "EMS",
        guest: true,
        removedAt: null,
        attendanceId: String(index),
        name: `Student ${index} \u6d4b\u8bd5 \ud83d\ude80`,
      })),
    });
    const document = await PDFDocument.load(
      await renderMtuSummaryPdf(aggregateMtuSummary([row], period)),
    );
    expect(document.getPageCount()).toBeGreaterThan(8);
    expect(document.getPageCount()).toBeLessThan(60);
  });
});
