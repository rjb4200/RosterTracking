"use client";

import { buildDurationSelection } from "./duration-options";

/**
 * A single quarter-hour duration picker shared by class creation and session
 * editing. The submitted value remains decimal hours.
 */
export function DurationFields({
  fieldLabel,
  value,
  onChange,
  name,
}: {
  fieldLabel: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
}) {
  const selection = buildDurationSelection(value);

  return (
    <div className="field">
      <span className="field-label">{fieldLabel}</span>
      <select
        className="select-input duration-select"
        aria-label={fieldLabel}
        value={selection.value}
        onChange={(event) => onChange(event.target.value)}
      >
        {selection.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selection.value}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
