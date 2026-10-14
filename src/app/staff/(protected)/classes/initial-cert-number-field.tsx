"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { SearchSelect } from "./search-select";

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
  const inputId = `${reactId}-input`;
  const [typing, setTyping] = useState(
    () => Boolean(value) && !recentNumbers.includes(value),
  );
  const options = [
    ...recentNumbers.map((number) => ({
      value: number,
      label: number,
      group: "Recently used",
    })),
    { value: NEW_NUMBER, label: "Type a new number", pinned: true },
  ];

  return (
    <SearchSelect
      id={`${reactId}-select`}
      label="Course number"
      placeholder="Search recent numbers…"
      emptyLabel="Select a recent number"
      options={options}
      value={typing ? NEW_NUMBER : value}
      required
      invalid={invalid}
      onChange={(next) => {
        if (next === NEW_NUMBER) {
          setTyping(true);
        } else {
          setTyping(false);
          onChange(next);
        }
      }}
      footer={
        typing ? (
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
        ) : null
      }
    />
  );
}
