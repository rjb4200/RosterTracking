"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import type { ActionState } from "./actions";

export function CertificateDispositionControls({
  classId,
  attendanceId,
  name,
  missingDates,
  disposition,
  action,
}: {
  classId: string;
  attendanceId: string;
  name: string;
  missingDates: string[];
  disposition: {
    decision: "include" | "exclude";
    note: string;
    resolvedByName: string;
  } | null;
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [decision, setDecision] = useState<"include" | "exclude">(
    disposition?.decision ?? "include",
  );
  return (
    <div className="stack-form">
      <p className="roster-note">
        {name} is missing {missingDates.length}{" "}
        {missingDates.length === 1 ? "class day" : "class days"} (
        {missingDates.join(", ")}).{" "}
        {disposition
          ? `Saved by ${disposition.resolvedByName}.`
          : "Choose how to handle the certificate."}
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p role="status">{state.success}</p> : null}
      <form action={formAction} className="stack-form">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="attendanceId" value={attendanceId} />
        <label className="checkbox-row">
          <input
            type="radio"
            name="decision"
            value="include"
            checked={decision === "include"}
            onChange={() => setDecision("include")}
          />
          <span>Include certificate</span>
        </label>
        <label className="checkbox-row">
          <input
            type="radio"
            name="decision"
            value="exclude"
            checked={decision === "exclude"}
            onChange={() => setDecision("exclude")}
          />
          <span>Exclude certificate</span>
        </label>
        <label htmlFor={`disposition-note-${attendanceId}`}>
          {decision === "include" ? "Inclusion note" : "Exclusion reason"}
        </label>
        <input
          id={`disposition-note-${attendanceId}`}
          name="note"
          className="search-input"
          defaultValue={disposition?.note ?? ""}
          required
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving..." : "Save disposition"}
        </Button>
      </form>
    </div>
  );
}
