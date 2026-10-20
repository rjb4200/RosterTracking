"use client";

import { useId } from "react";

const MINUTE_OPTIONS = [0, 15, 30, 45] as const;

function toMinutes(value: string): number {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.round(hours * 60);
}

/**
 * Quarter-hour duration entry shared by class creation and session editing.
 * The visible controls are hours + minutes; the value submitted is the stored
 * decimal number of hours.
 */
export function DurationFields({
  fieldLabel,
  ariaPrefix,
  value,
  onChange,
  name,
  maxHours = 24,
}: {
  fieldLabel: string;
  ariaPrefix?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  maxHours?: number;
}) {
  const suffix = useId();
  const totalMinutes = Math.min(maxHours * 60, toMinutes(value));
  const selectedHours = Math.floor(totalMinutes / 60);
  const selectedMinute = totalMinutes % 60;
  const hourOptions = Array.from({ length: maxHours + 1 }, (_, hour) => hour);
  const minuteOptions = MINUTE_OPTIONS.filter(
    (minute) => selectedHours * 60 + minute <= maxHours * 60,
  );
  const prefix = ariaPrefix ?? fieldLabel;
  const decimal = String(totalMinutes / 60);

  function setHours(hours: number) {
    const minute =
      hours * 60 + selectedMinute <= maxHours * 60 ? selectedMinute : 0;
    onChange(String((hours * 60 + minute) / 60));
  }

  function setMinutes(minute: number) {
    onChange(String((selectedHours * 60 + minute) / 60));
  }

  return (
    <div className="field">
      <span className="field-label">{fieldLabel}</span>
      <div className="duration-fields">
        <label htmlFor={`duration-hours-${suffix}`}>
          Hours{" "}
          <select
            id={`duration-hours-${suffix}`}
            className="select-input"
            aria-label={`${prefix} hours`}
            value={selectedHours}
            onChange={(event) => setHours(Number(event.target.value))}
          >
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`duration-minutes-${suffix}`}>
          Minutes{" "}
          <select
            id={`duration-minutes-${suffix}`}
            className="select-input"
            aria-label={`${prefix} minutes`}
            value={selectedMinute}
            onChange={(event) => setMinutes(Number(event.target.value))}
          >
            {minuteOptions.map((minute) => (
              <option key={minute} value={minute}>
                {String(minute).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
      </div>
      {name ? <input type="hidden" name={name} value={decimal} /> : null}
    </div>
  );
}
