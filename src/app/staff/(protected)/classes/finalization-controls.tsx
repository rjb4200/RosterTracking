"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ActionState } from "./actions";

/**
 * The finalize-and-sign action. The step is intentionally minimal — the
 * certification, the signature, and the button — so finalizing takes seconds.
 * Class, session, instructor, MTU, and attendance editing live in the earlier
 * steps.
 */
export function FinalizationControls({
  classId,
  status,
  finalizeAction,
  canFinalize = true,
  isLeadInstructor = false,
}: {
  classId: string;
  status: string;
  finalizeAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  canFinalize?: boolean;
  isLeadInstructor?: boolean;
}) {
  const [finalizeState, finalizeFormAction, finalizing] = useActionState(
    finalizeAction,
    undefined,
  );
  if (status !== "open") return null;
  if (!isLeadInstructor) {
    return (
      <p className="roster-note">
        Only the class&apos;s lead instructor can finalize and sign this roster.
      </p>
    );
  }
  return (
    <div className="stack-form">
      {finalizeState?.error ? (
        <p className="form-error">{finalizeState.error}</p>
      ) : null}
      <form action={finalizeFormAction} className="stack-form finalize-form">
        <input type="hidden" name="classId" value={classId} />
        <label className="checkbox-row">
          <input type="checkbox" name="certified" value="true" required />
          <span>I certify that this roster is complete and accurate.</span>
        </label>
        <label htmlFor="finalize-typed-name">Signature</label>
        <input
          id="finalize-typed-name"
          name="typedName"
          className="search-input"
          placeholder="Type your full name to sign"
          required
        />
        <Button type="submit" disabled={finalizing || !canFinalize}>
          Finalize roster
        </Button>
      </form>
    </div>
  );
}

export function ReopenControl({
  classId,
  reopenAction,
}: {
  classId: string;
  reopenAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [reopenState, reopenFormAction, reopening] = useActionState(
    reopenAction,
    undefined,
  );
  return (
    <div className="stack-form">
      {reopenState?.error ? (
        <p className="form-error">{reopenState.error}</p>
      ) : null}
      <form action={reopenFormAction} className="inline-form">
        <input type="hidden" name="classId" value={classId} />
        <label htmlFor="reopen-reason">Reopen note</label>
        <input
          id="reopen-reason"
          name="reason"
          className="search-input"
          required
        />
        <Button type="submit" variant="secondary" disabled={reopening}>
          Reopen for correction
        </Button>
      </form>
    </div>
  );
}
