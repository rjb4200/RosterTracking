"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

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
        {status === "open" ? (
          <Link
            href={`/staff/classes/${classId}/review`}
            className={buttonVariants()}
          >
            Review and finalize
          </Link>
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
