export const GITHUB_ISSUE_REPO = "rjb4200/RosterTracking";

/** Categories offered on the report form; the key is also the issue label. */
export const ISSUE_CATEGORIES = {
  bug: "Bug",
  feature: "Feature request",
  question: "Question",
} as const;

export type IssueCategory = keyof typeof ISSUE_CATEGORIES;

export const DEFAULT_ISSUE_CATEGORY: IssueCategory = "bug";

/** A stable label applied to every user-filed report. */
export const ISSUE_BASE_LABEL = "user-report";

export function isIssueCategory(value: string): value is IssueCategory {
  return Object.hasOwn(ISSUE_CATEGORIES, value);
}

export function issueLabels(category: IssueCategory): string[] {
  return [ISSUE_BASE_LABEL, category];
}

/**
 * Whether the report affordance is offered. A non-secret, build-time flag so
 * both the server-rendered header and the client error boundary can gate on it;
 * the token that actually files the issue stays server-only.
 */
export function isIssueReportingOffered(): boolean {
  return process.env.NEXT_PUBLIC_ISSUE_REPORTING === "1";
}
