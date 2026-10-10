"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ActionState } from "./actions";

export function InstructorAssignmentForm({
  action,
  classId,
  staff,
}: {
  action: (
    previous: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  classId: string;
  staff: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="isLead" value="true" />
      <select
        name="userId"
        className="select-input"
        aria-label="Instructor"
        required
      >
        {staff.map((instructor) => (
          <option key={instructor.id} value={instructor.id}>
            {instructor.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Assigning..." : "Set lead instructor"}
      </Button>
      {state?.error ? <p role="alert">{state.error}</p> : null}
      {state?.success ? <p role="status">{state.success}</p> : null}
    </form>
  );
}
