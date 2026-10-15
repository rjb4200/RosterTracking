"use client";

import { PageHeading } from "@/components/ui/page-heading";

import { ReportIssue } from "./report-issue";
import { reportIssueAction } from "./report-issue-action";

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Staff workspace"
        title="This page could not be loaded"
      />
      <p className="text-muted-foreground">
        Something went wrong loading this page. Try again, or return to your
        workspace.
      </p>
      <div className="admin-actions">
        <button
          className="button button-primary"
          onClick={() => reset()}
          type="button"
        >
          Try again
        </button>
        {/* A plain anchor is deliberate: it forces a full load if the client
            router is in a bad state. */}
        <a className="button" href="/staff">
          Back to workspace
        </a>
        <ReportIssue
          action={reportIssueAction}
          triggerLabel="Report this problem"
          triggerClassName="button"
          defaultSubject="A staff page failed to load"
          correlationId={error.digest}
        />
      </div>
    </main>
  );
}
