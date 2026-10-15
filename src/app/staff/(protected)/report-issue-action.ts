"use server";

import {
  createIssue,
  isIssueReportingConfigured,
} from "@/modules/issue-reporting/client";
import {
  DEFAULT_ISSUE_CATEGORY,
  isIssueCategory,
  issueLabels,
} from "@/modules/issue-reporting/constants";
import {
  buildIssueBody,
  classIdFromRoute,
  issueTitle,
} from "@/modules/issue-reporting/context";
import { requirePermission } from "@/modules/staff-auth/authorization";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";

export interface ReportIssueState {
  error?: string;
  url?: string;
  number?: number;
}

function read(formData: FormData, key: string): string {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function reportIssueAction(
  _prev: ReportIssueState | undefined,
  formData: FormData,
): Promise<ReportIssueState> {
  if (!isIssueReportingConfigured()) {
    return { error: "Issue reporting is not configured." };
  }
  const staff = await requirePermission(PERMISSIONS.STAFF_ACCESS);

  const category = read(formData, "category") || DEFAULT_ISSUE_CATEGORY;
  if (!isIssueCategory(category)) return { error: "Choose a category." };
  const subject = read(formData, "subject");
  if (!subject) return { error: "Enter a subject." };
  if (subject.length > 200) {
    return { error: "Keep the subject under 200 characters." };
  }
  const description = read(formData, "description");
  if (!description) return { error: "Describe what happened." };
  if (description.length > 4000) {
    return { error: "Keep the description under 4000 characters." };
  }

  const route = read(formData, "route").slice(0, 300) || "/staff";
  const userAgent = read(formData, "userAgent").slice(0, 300);
  const correlationId = read(formData, "correlationId").slice(0, 200) || null;

  try {
    const issue = await createIssue({
      title: issueTitle(subject),
      body: buildIssueBody({
        description,
        context: {
          route,
          environment:
            process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
          staffName: staff.displayName,
          staffUsername: staff.username,
          staffRoles: [...staff.roleCodes],
          timestamp: new Date().toISOString(),
          classId: classIdFromRoute(route),
          correlationId,
          userAgent: userAgent || null,
        },
      }),
      labels: issueLabels(category),
    });
    return { url: issue.url, number: issue.number };
  } catch {
    return { error: "The report could not be filed. Please try again." };
  }
}
