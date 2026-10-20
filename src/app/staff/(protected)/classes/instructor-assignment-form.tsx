"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { isFireInstructor } from "@/modules/classes/fire-signer";

import type { ActionState } from "./actions";

export interface InstructorStaffOption {
  id: string;
  name: string;
  ffn: string | null;
  instructorLevel: number | null;
}

export function InstructorAssignmentForm({
  action,
  classId,
  staff,
  currentLeadId,
  currentAssistantId,
}: {
  action: (
    previous: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  classId: string;
  staff: InstructorStaffOption[];
  currentLeadId: string;
  currentAssistantId: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [leadId, setLeadId] = useState(currentLeadId);
  const [assistantId, setAssistantId] = useState(currentAssistantId ?? "");
  const assistantOptions = staff.filter(
    (instructor) => instructor.id !== leadId,
  );

  return (
    <form action={formAction} className="stack-form">
      <input type="hidden" name="classId" value={classId} />
      <div className="field">
        <label htmlFor="edit-lead-instructor">Lead instructor</label>
        <select
          id="edit-lead-instructor"
          name="leadInstructorId"
          className="select-input"
          value={leadId}
          onChange={(event) => {
            const nextLeadId = event.target.value;
            setLeadId(nextLeadId);
            if (assistantId === nextLeadId) setAssistantId("");
          }}
          required
        >
          {staff.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.name}
            </option>
          ))}
        </select>
        <p className="roster-note">
          Saving a different lead removes the current lead assignment. The
          previous lead is not moved into the assistant slot.
        </p>
      </div>
      <div className="field">
        <label htmlFor="edit-assistant-instructor">Assistant instructor</label>
        <select
          id="edit-assistant-instructor"
          name="assistantInstructorId"
          className="select-input"
          value={assistantId}
          onChange={(event) => setAssistantId(event.target.value)}
        >
          <option value="">No assistant</option>
          {assistantOptions.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.name}
              {isFireInstructor(instructor) ? " (fire instructor)" : ""}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save instructors"}
      </Button>
      {state?.error ? <p role="alert">{state.error}</p> : null}
      {state?.success ? <p role="status">{state.success}</p> : null}
    </form>
  );
}
