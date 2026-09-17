"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ReportingActionState } from "./actions";

export function ReportingDestinationControl({
  revisionId,
  reportingSystemId,
  referenceNumber,
  action,
}: {
  revisionId: string;
  reportingSystemId: string;
  referenceNumber: string | null;
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
      <input
        name="referenceNumber"
        className="search-input"
        placeholder="Reference number"
        defaultValue={referenceNumber ?? ""}
      />
      <input
        name="notes"
        className="search-input"
        placeholder="Notes required for correction"
      />
      <Button name="status" value="entered" type="submit" disabled={pending}>
        Mark entered
      </Button>
      <Button
        name="status"
        value="not_required"
        type="submit"
        variant="secondary"
        disabled={pending}
      >
        Not required
      </Button>
      <Button
        name="status"
        value="needs_correction"
        type="submit"
        variant="destructive"
        disabled={pending}
      >
        Needs correction
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
