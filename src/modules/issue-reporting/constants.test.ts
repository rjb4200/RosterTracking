import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isIssueCategory,
  isIssueReportingOffered,
  issueLabels,
} from "./constants";

describe("issue categories", () => {
  it("accepts the known categories and rejects others", () => {
    expect(isIssueCategory("bug")).toBe(true);
    expect(isIssueCategory("feature")).toBe(true);
    expect(isIssueCategory("question")).toBe(true);
    expect(isIssueCategory("nonsense")).toBe(false);
  });

  it("maps a category to the base label and the category label", () => {
    expect(issueLabels("feature")).toEqual(["user-report", "feature"]);
  });
});

describe("isIssueReportingOffered", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is offered only when the public flag is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ISSUE_REPORTING", "");
    expect(isIssueReportingOffered()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ISSUE_REPORTING", "1");
    expect(isIssueReportingOffered()).toBe(true);
  });
});
