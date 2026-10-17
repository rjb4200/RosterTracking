import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { buildActivityReport } from "./ce-activity";
import {
  agencyActivityQuery,
  siteActivityQuery,
  studentTranscriptQuery,
} from "./ce-query";
import { buildStudentTranscript, classifyCeCategory } from "./ce-transcript";
import {
  parseReportPeriod,
  type ReportPeriod,
  renewalCyclePresets,
  validateReportPeriod,
} from "./period";

const period: ReportPeriod = {
  from: new Date("2026-03-01T05:00:00Z"),
  to: new Date("2026-04-01T04:00:00Z"),
};

describe("renewal cycle presets", () => {
  it("derives the last, current, and next two-year cycles ending 12/31", () => {
    const presets = renewalCyclePresets(new Date("2026-06-15T16:00:00Z"));
    expect(presets.map((preset) => preset.endYear)).toEqual([2025, 2026, 2027]);
    expect(presets[1]).toMatchObject({
      id: "cycle-2026",
      from: "2025-01-01",
      to: "2026-12-31",
    });
    expect(presets[2]).toMatchObject({ from: "2026-01-01", to: "2027-12-31" });
  });

  it("advances with the calendar year without configuration", () => {
    const presets = renewalCyclePresets(new Date("2027-01-02T16:00:00Z"));
    expect(presets.map((preset) => preset.endYear)).toEqual([2026, 2027, 2028]);
  });
});

describe("period validation", () => {
  it("rejects a period whose end is not after its start", () => {
    expect(() =>
      validateReportPeriod({
        from: new Date("2026-03-05T00:00:00Z"),
        to: new Date("2026-03-05T00:00:00Z"),
      }),
    ).toThrow();
  });

  it("rejects a parse where the end precedes the start", () => {
    expect(() => parseReportPeriod("2026-03-10", "2026-03-01")).toThrow();
  });

  it("treats the end day as inclusive", () => {
    const parsed = parseReportPeriod("2026-03-01", "2026-03-31");
    expect(parsed.from < parsed.to).toBe(true);
  });
});

describe("transcript classification and totals", () => {
  it("classifies a class exactly once", () => {
    expect(
      classifyCeCategory({ emsCategoryName: "Airway", reportsToKbems: true }),
    ).toBe("Airway");
    expect(
      classifyCeCategory({ emsCategoryName: null, reportsToKbems: true }),
    ).toBe("Uncategorized");
    expect(
      classifyCeCategory({ emsCategoryName: null, reportsToKbems: false }),
    ).toBe("Other");
  });

  it("emits one row per class even when sources repeat, and totals hours once", () => {
    const transcript = buildStudentTranscript(
      [
        {
          classId: "class-b",
          course: "Trauma Assessment",
          classDate: "2026-03-20T13:00:00Z",
          emsCategoryName: "Trauma",
          reportsToKbems: true,
          revisionId: "rev-b",
          attendanceId: "att-b",
          creditedHours: 2,
        },
        {
          classId: "class-a",
          course: "Cardiac Arrest",
          classDate: "2026-03-04T13:00:00Z",
          emsCategoryName: "Cardiology",
          reportsToKbems: true,
          revisionId: null,
          attendanceId: "att-a",
          creditedHours: 1.5,
        },
        {
          classId: "class-a",
          course: "Cardiac Arrest (duplicate source)",
          classDate: "2026-03-04T13:00:00Z",
          emsCategoryName: "Cardiology",
          reportsToKbems: true,
          revisionId: null,
          attendanceId: "att-a",
          creditedHours: 1.5,
        },
      ],
      period,
    );
    expect(transcript.rows).toHaveLength(2);
    expect(transcript.rows.map((row) => row.classId)).toEqual([
      "class-a",
      "class-b",
    ]);
    expect(transcript.totalHours).toBe(3.5);
  });

  it("produces an empty transcript with a zero total", () => {
    expect(buildStudentTranscript([], period)).toMatchObject({
      rows: [],
      totalHours: 0,
    });
  });
});

describe("activity report", () => {
  it("classifies rows and totals hours and attendances", () => {
    const report = buildActivityReport(
      [
        {
          classId: "class-a",
          course: "Airway Basics",
          classDate: "2026-03-04T13:00:00Z",
          emsCategoryName: "Airway",
          reportsToKbems: true,
          classHours: 4,
          attendees: ["Ada Lovelace", "Alan Turing"],
        },
        {
          classId: "class-b",
          course: "Pump Operations",
          classDate: "2026-03-18T13:00:00Z",
          emsCategoryName: null,
          reportsToKbems: false,
          classHours: 3,
          attendees: ["Grace Hopper"],
        },
      ],
      period,
    );
    expect(report.rows.map((row) => row.category)).toEqual(["Airway", "Other"]);
    expect(report.totalHours).toBe(7);
    expect(report.totalAttendees).toBe(3);
  });
});

describe("activity and transcript scope queries", () => {
  const dialect = new PgDialect();

  it("scopes the transcript to the student, active attendance, and the period", () => {
    const query = dialect.sqlToQuery(
      studentTranscriptQuery(period, "student-1"),
    );
    expect(query.params).toEqual([
      "student-1",
      period.from.toISOString(),
      period.to.toISOString(),
    ]);
    expect(query.sql).toContain("a.removed_at is null");
    expect(query.sql).toContain("c.status <> 'cancelled'");
    expect(query.sql).toContain("min(cc.starts_at)");
    expect(query.sql).not.toContain("is_active");
  });

  it("scopes the agency report to the agency's people", () => {
    const query = dialect.sqlToQuery(agencyActivityQuery(period, "agency-1"));
    expect(query.params).toContain("agency-1");
    expect(query.sql).toContain("a2.agency_id");
    expect(query.sql).toContain("a.removed_at is null");
  });

  it("scopes the site report to classes held at the site", () => {
    const query = dialect.sqlToQuery(siteActivityQuery(period, "site-1"));
    expect(query.params).toContain("site-1");
    expect(query.sql).toContain("c.training_site_id");
    expect(query.sql).toContain("a3.removed_at is null");
  });
});
