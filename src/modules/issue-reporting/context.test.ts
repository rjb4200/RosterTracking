import { describe, expect, it } from "vitest";

import { buildIssueBody, classIdFromRoute, issueTitle } from "./context";

const CLASS_ID = "11111111-1111-1111-1111-111111111111";

const context = {
  route: `/staff/classes/${CLASS_ID}`,
  environment: "production",
  staffName: "Jane Instructor",
  staffUsername: "jane",
  staffRoles: ["instructor"],
  timestamp: "2026-10-14T00:00:00.000Z",
  classId: CLASS_ID,
  correlationId: "abc123",
  userAgent: "Mozilla/5.0",
};

describe("buildIssueBody", () => {
  it("includes the description and the captured context", () => {
    const body = buildIssueBody({
      description: "The roster did not load.",
      context,
    });
    expect(body).toContain("The roster did not load.");
    expect(body).toContain(`/staff/classes/${CLASS_ID}`);
    expect(body).toContain("Environment: production");
    expect(body).toContain("Jane Instructor (jane)");
    expect(body).toContain("instructor");
    expect(body).toContain("abc123");
    expect(body).toContain("Mozilla/5.0");
  });

  it("omits the class and correlation lines when absent", () => {
    const body = buildIssueBody({
      description: "x",
      context: { ...context, classId: null, correlationId: null },
    });
    expect(body).not.toContain("Class:");
    expect(body).not.toContain("Correlation:");
  });
});

describe("issueTitle", () => {
  it("prefixes and collapses whitespace", () => {
    expect(issueTitle("  Roster   did not load ")).toBe(
      "[app] Roster did not load",
    );
  });

  it("truncates a long subject to the title limit", () => {
    const title = issueTitle("x".repeat(400));
    expect(title.length).toBeLessThanOrEqual(200);
    expect(title.endsWith("…")).toBe(true);
  });
});

describe("classIdFromRoute", () => {
  it("extracts a class id from a class route", () => {
    expect(classIdFromRoute(`/staff/classes/${CLASS_ID}`)).toBe(CLASS_ID);
    expect(classIdFromRoute(`/staff/classes/${CLASS_ID}/review`)).toBe(
      CLASS_ID,
    );
  });

  it("returns null for non-class routes", () => {
    expect(classIdFromRoute("/staff/classes")).toBeNull();
    expect(classIdFromRoute("/staff/reporting")).toBeNull();
  });
});
