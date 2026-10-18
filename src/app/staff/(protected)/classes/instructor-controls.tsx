"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ActionState } from "./actions";

/**
 * Per-instructor controls: promote to lead, or remove the assignment. The
 * server refuses removing the only lead, so the control stays available and the
 * refusal is surfaced.
 */
export function InstructorRowActions({
  classId,
  userId,
  isLead,
  assignAction,
  removeAction,
}: {
  classId: string;
  userId: string;
  isLead: boolean;
  assignAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  removeAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [assignState, assignForm, assigning] = useActionState(
    assignAction,
    undefined,
  );
  const [removeState, removeForm, removing] = useActionState(
    removeAction,
    undefined,
  );
  return (
    <div className="member-actions">
      {!isLead ? (
        <form action={assignForm}>
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="isLead" value="true" />
          <Button type="submit" variant="secondary" disabled={assigning}>
            Make lead
          </Button>
        </form>
      ) : null}
      <form action={removeForm}>
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" variant="destructive" disabled={removing}>
          Remove
        </Button>
      </form>
      {removeState?.error ? <p role="alert">{removeState.error}</p> : null}
      {assignState?.error ? <p role="alert">{assignState.error}</p> : null}
      {removeState?.success ? <p role="status">{removeState.success}</p> : null}
    </div>
  );
}
