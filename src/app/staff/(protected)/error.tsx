"use client";

import { PageHeading } from "@/components/ui/page-heading";

export default function StaffError({ reset }: { reset: () => void }) {
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
      </div>
    </main>
  );
}
