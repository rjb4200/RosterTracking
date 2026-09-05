"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ReportingActionState } from "./actions";

export function ReportingDestinationControl({
  revisionId,
  reportingSystemId,
  status,
  action,
}: {
  revisionId: string;
  reportingSystemId: string;
  status: string;
  action: (
    previous: ReportingActionState | undefined,
    formData: FormData,
  ) => Promise<ReportingActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="reportingSystemId" value={reportingSystemId} />
      <label className="sr-only" htmlFor={`status-${reportingSystemId}`}>
        Reporting status
      </label>
      <select
        id={`status-${reportingSystemId}`}
        name="status"
        className="select-input"
        defaultValue={status}
      >
        <option value="pending">Pending</option>
        <option value="reported">Reported</option>
        <option value="needs_correction">Needs correction</option>
      </select>
      <input
        name="referenceNumber"
        className="search-input"
        placeholder="Reference number"
      />
      <input
        name="notes"
        className="search-input"
        placeholder="Notes (required for correction)"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        Update
      </Button>
      {state?.error ? (
        <p className="form-error" aria-live="polite">
          {state.error}
        </p>
      ) : null}
      {state?.success ? <p aria-live="polite">{state.success}</p> : null}
    </form>
  );
}
