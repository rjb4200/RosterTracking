"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// A sentinel value; never a real course number.
const NEW_NUMBER = "__new_initial_cert_number__";

/**
 * The initial-certification course number as one either/or control: a selection
 * from the recently used numbers, or a free-text new number revealed by the
 * "Type a new number" option.
 */
export function InitialCertNumberField({
  value,
  recentNumbers,
  onChange,
  invalid = false,
}: {
  value: string;
  recentNumbers: string[];
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const reactId = useId();
  const selectId = `${reactId}-select`;
  const inputId = `${reactId}-input`;
  const [typing, setTyping] = useState(
    () => Boolean(value) && !recentNumbers.includes(value),
  );

  return (
    <div className="field">
      <Label htmlFor={selectId}>
        Course number
        <span className="required-mark" aria-hidden="true">
          {" "}
          *
        </span>
      </Label>
      <select
        id={selectId}
        className="select-input"
        value={typing ? NEW_NUMBER : value}
        required
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          const next = event.target.value;
          if (next === NEW_NUMBER) {
            setTyping(true);
          } else {
            setTyping(false);
            onChange(next);
          }
        }}
      >
        <option value="">Select a recent number</option>
        {recentNumbers.length ? (
          <optgroup label="Recently used">
            {recentNumbers.map((number) => (
              <option key={number} value={number}>
                {number}
              </option>
            ))}
          </optgroup>
        ) : null}
        <option value={NEW_NUMBER}>Type a new number</option>
      </select>
      {typing ? (
        <div className="field">
          <Label htmlFor={inputId}>New course number</Label>
          <Input
            id={inputId}
            value={value}
            placeholder="126-26-02-R"
            aria-invalid={invalid || undefined}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
