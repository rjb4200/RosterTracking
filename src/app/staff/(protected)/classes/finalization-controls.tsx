"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ActionState } from "./actions";

export function FinalizationControls({
  classId,
  status,
  finalizeAction,
  reopenAction,
  canFinalize = true,
  isLeadInstructor = false,
  canReopen = false,
}: {
  classId: string;
  status: string;
  finalizeAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  reopenAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  canFinalize?: boolean;
  isLeadInstructor?: boolean;
  canReopen?: boolean;
}) {
  const [finalizeState, finalizeFormAction, finalizing] = useActionState(
    finalizeAction,
    undefined,
  );
  const [reopenState, reopenFormAction, reopening] = useActionState(
    reopenAction,
    undefined,
  );
  if (!["completed", "finalized"].includes(status)) return null;
  return (
    <div className="stack-form">
      {finalizeState?.error || reopenState?.error ? (
        <p className="form-error">
          {finalizeState?.error ?? reopenState?.error}
        </p>
      ) : null}
      {status === "completed" ? (
        isLeadInstructor ? (
          <form action={finalizeFormAction} className="stack-form">
            <input type="hidden" name="classId" value={classId} />
            <label className="checkbox-row">
              <input type="checkbox" name="certified" value="true" required />
              <span>
                I certify that this roster is complete and accurate to the best
                of my knowledge.
              </span>
            </label>
            <label htmlFor="finalize-typed-name">Sign with your name</label>
            <input
              id="finalize-typed-name"
              name="typedName"
              className="search-input"
              required
            />
            <Button type="submit" disabled={finalizing || !canFinalize}>
              Finalize and sign roster
            </Button>
          </form>
        ) : (
          <p className="roster-note">
            Only the class&apos;s lead instructor can finalize and sign this
            roster.
          </p>
        )
      ) : canReopen ? (
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
      ) : (
        <p className="roster-note">
          An Administrator can reopen this roster for correction.
        </p>
      )}
    </div>
  );
}
