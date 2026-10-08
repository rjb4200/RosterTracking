"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { CREDIT_ADJUSTMENT_REASONS } from "@/modules/instructor-roster/constants";

import { type RosterActionState, rosterAction } from "./roster-actions";

function Status({ state }: { state: RosterActionState | undefined }) {
  return (
    <p
      aria-live="polite"
      className={state?.error ? "form-error" : "form-success"}
    >
      {state?.error ?? state?.success}
    </p>
  );
}

export function AttendanceControls({
  classId,
  attendanceId,
  creditedHours,
  scheduledHours,
}: {
  classId: string;
  attendanceId: string;
  creditedHours: string | null;
  scheduledHours: number;
}) {
  const [state, action, pending] = useActionState(rosterAction, undefined);
  const [confirming, setConfirming] = useState(false);
  const [reasonPreset, setReasonPreset] = useState("");
  return (
    <div className="roster-entry-controls">
      <Status state={state} />
      <form action={action} className="inline-form">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="attendanceId" value={attendanceId} />
        <input type="hidden" name="operation" value="credit" />
        <label>
          Credit{" "}
          <input
            className="search-input credit-input"
            name="creditedHours"
            type="number"
            min="0"
            max={scheduledHours}
            step="0.01"
            defaultValue={creditedHours ?? scheduledHours}
            required
          />
        </label>
        <label>
          Adjustment reason
          <select
            className="select-input"
            name="reasonPreset"
            onChange={(event) => setReasonPreset(event.target.value)}
          >
            <option value="">Select when credit is adjusted</option>
            {CREDIT_ADJUSTMENT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </label>
        {reasonPreset === "Other" ? (
          <label>
            Other explanation
            <input className="search-input" name="otherReason" required />
          </label>
        ) : null}
        <Button type="submit" variant="secondary" disabled={pending}>
          Update credit
        </Button>
      </form>
      {confirming ? (
        <form
          action={action}
          className="inline-form roster-removal"
          aria-label="Confirm attendance removal"
        >
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="attendanceId" value={attendanceId} />
          <input type="hidden" name="operation" value="remove" />
          <label>
            Removal reason{" "}
            <input className="search-input" name="reason" required />
          </label>
          <Button type="submit" variant="destructive" disabled={pending}>
            Confirm removal
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirming(true)}
        >
          Remove attendance
        </Button>
      )}
    </div>
  );
}
