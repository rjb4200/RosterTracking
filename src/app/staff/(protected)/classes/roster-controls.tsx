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

/**
 * Credit adjustment in hours and minutes. Class hours move in quarter-hour
 * steps, so the minutes menu offers only 00/15/30/45 and never exceeds the
 * class scheduled total. The submitted value stays the stored decimal.
 */
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
  const totalMinutes = Math.max(0, Math.round(scheduledHours * 60));
  const initialMinutes =
    creditedHours === null
      ? totalMinutes
      : Math.min(
          totalMinutes,
          Math.max(0, Math.round(Number(creditedHours) * 60)),
        );
  const [creditMinutes, setCreditMinutes] = useState(initialMinutes);
  const selectedHours = Math.floor(creditMinutes / 60);
  const selectedMinute = creditMinutes % 60;
  const hourOptions = Array.from(
    { length: Math.floor(totalMinutes / 60) + 1 },
    (_, index) => index,
  );
  const minuteOptions = [0, 15, 30, 45].filter(
    (minute) => selectedHours * 60 + minute <= totalMinutes,
  );
  return (
    <div className="roster-entry-controls">
      <Status state={state} />
      <form action={action} className="inline-form">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="attendanceId" value={attendanceId} />
        <input type="hidden" name="operation" value="credit" />
        <input
          type="hidden"
          name="creditedHours"
          value={String(creditMinutes / 60)}
        />
        <label>
          Hours{" "}
          <select
            className="select-input"
            aria-label="Hours"
            value={selectedHours}
            onChange={(event) => {
              const hours = Number(event.target.value);
              const minute =
                hours * 60 + selectedMinute <= totalMinutes
                  ? selectedMinute
                  : 0;
              setCreditMinutes(hours * 60 + minute);
            }}
          >
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minutes{" "}
          <select
            className="select-input"
            aria-label="Minutes"
            value={selectedMinute}
            onChange={(event) =>
              setCreditMinutes(selectedHours * 60 + Number(event.target.value))
            }
          >
            {minuteOptions.map((minute) => (
              <option key={minute} value={minute}>
                {String(minute).padStart(2, "0")}
              </option>
            ))}
          </select>
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
