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
  mtuInstructor: boolean;
}

export function InstructorAssignmentForm({
  action,
  classId,
  staff,
  currentLeadId,
  currentAssistantId,
  currentAdditionalIds,
  canEditAdditional,
}: {
  action: (
    previous: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  classId: string;
  staff: InstructorStaffOption[];
  currentLeadId: string;
  currentAssistantId: string | null;
  currentAdditionalIds: string[];
  canEditAdditional: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [leadId, setLeadId] = useState(currentLeadId);
  const [assistantId, setAssistantId] = useState(currentAssistantId ?? "");
  const [additionalIds, setAdditionalIds] = useState(currentAdditionalIds);
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
            setAdditionalIds((current) =>
              current.filter((id) => id !== nextLeadId),
            );
          }}
          required
        >
          {staff.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.name}
              {instructor.mtuInstructor ? " (MTU instructor)" : ""}
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
          onChange={(event) => {
            const nextAssistant = event.target.value;
            setAssistantId(nextAssistant);
            setAdditionalIds((current) =>
              current.filter((id) => !nextAssistant || id !== nextAssistant),
            );
          }}
        >
          <option value="">No assistant</option>
          {assistantOptions.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.name}
              {isFireInstructor(instructor) ? " (fire instructor)" : ""}
              {instructor.mtuInstructor ? " (MTU instructor)" : ""}
            </option>
          ))}
        </select>
      </div>
      {canEditAdditional ? (
        <details className="review-group">
          <summary>
            Additional instructors
            {additionalIds.length ? ` (${additionalIds.length} selected)` : ""}
          </summary>
          <p className="roster-note">
            The assistant is the second name on official forms. Additional
            instructors appear on the instructor supplement.
          </p>
          {staff
            .filter(
              (instructor) =>
                instructor.id !== leadId && instructor.id !== assistantId,
            )
            .map((instructor) => (
              <label key={instructor.id} className="checkbox-field field-wide">
                <input
                  type="checkbox"
                  checked={additionalIds.includes(instructor.id)}
                  onChange={(event) =>
                    setAdditionalIds((current) =>
                      event.target.checked
                        ? [...current, instructor.id]
                        : current.filter((id) => id !== instructor.id),
                    )
                  }
                />
                {instructor.name}
              </label>
            ))}
          {additionalIds.map((id) => (
            <input
              key={id}
              type="hidden"
              name="additionalInstructorIds"
              value={id}
            />
          ))}
        </details>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save instructors"}
      </Button>
      {state?.error ? <p role="alert">{state.error}</p> : null}
      {state?.success ? <p role="status">{state.success}</p> : null}
    </form>
  );
}
