"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ActionState } from "./actions";

export function LifecycleControls({
  classId,
  status,
  action,
}: {
  classId: string;
  status: string;
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <div className="stack-form">
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="admin-actions">
        {status === "draft" ? (
          <form action={formAction}>
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="status" value="open" />
            <Button type="submit" disabled={pending}>
              Open class
            </Button>
          </form>
        ) : null}
        {status === "open" ? (
          <form action={formAction}>
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="status" value="completed" />
            <Button type="submit" disabled={pending}>
              Complete class
            </Button>
          </form>
        ) : null}
        {!["cancelled", "finalized"].includes(status) ? (
          <form action={formAction} className="inline-form">
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="status" value="cancelled" />
            <input
              name="cancellationReason"
              className="search-input"
              placeholder="Cancellation reason"
              required
            />
            <Button type="submit" variant="destructive" disabled={pending}>
              Cancel class
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
