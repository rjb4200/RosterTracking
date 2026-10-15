import "server-only";

import { GITHUB_ISSUE_REPO } from "./constants";

export interface CreatedIssue {
  number: number;
  url: string;
}

/** Whether a token is configured to file issues. */
export function isIssueReportingConfigured(): boolean {
  return Boolean(process.env.GITHUB_ISSUE_TOKEN);
}

/**
 * Files one issue on the application's repository through the GitHub API. The
 * token stays server-side and never appears in a thrown error.
 */
export async function createIssue(input: {
  title: string;
  body: string;
  labels: string[];
}): Promise<CreatedIssue> {
  const token = process.env.GITHUB_ISSUE_TOKEN;
  if (!token) throw new Error("Issue reporting is not configured.");
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_ISSUE_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "roster-tracking-issue-report",
      },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        labels: input.labels,
      }),
    },
  );
  if (!response.ok) throw new Error("The issue could not be created.");
  let payload: { number?: unknown; html_url?: unknown } = {};
  try {
    payload = (await response.json()) as {
      number?: unknown;
      html_url?: unknown;
    };
  } catch {
    payload = {};
  }
  if (
    typeof payload.number !== "number" ||
    typeof payload.html_url !== "string"
  ) {
    throw new Error("The issue could not be created.");
  }
  return { number: payload.number, url: payload.html_url };
}
