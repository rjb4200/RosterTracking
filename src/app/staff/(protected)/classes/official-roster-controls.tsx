"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { TEMPLATE_MAPPINGS } from "@/modules/official-roster-pdfs/mappings";

import type { ActionState } from "./actions";

export function OfficialRosterControls({
  classId,
  revisionId,
  action,
}: {
  classId: string;
  revisionId: string;
  action: (
    previous: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      className="inline-form"
      aria-label="Official roster generation"
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="revisionId" value={revisionId} />
      <label htmlFor={`official-roster-${revisionId}`}>Official roster</label>
      <select
        id={`official-roster-${revisionId}`}
        name="formType"
        className="select-input"
        defaultValue="kfs-1a"
      >
        {Object.values(TEMPLATE_MAPPINGS).map((mapping) => (
          <option key={mapping.formType} value={mapping.formType}>
            {mapping.formType.toUpperCase()} ({mapping.templateVersion})
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending}>
        Generate PDF
      </Button>
      {state?.error ? <span className="form-error">{state.error}</span> : null}
    </form>
  );
}
