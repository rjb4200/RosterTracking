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
        <form action={finalizeFormAction}>
          <input type="hidden" name="classId" value={classId} />
          <Button type="submit" disabled={finalizing || !canFinalize}>
            Finalize roster
          </Button>
        </form>
      ) : (
        <form action={reopenFormAction} className="inline-form">
          <input type="hidden" name="classId" value={classId} />
          <label htmlFor="reopen-reason">Reopen reason</label>
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
      )}
    </div>
  );
}
