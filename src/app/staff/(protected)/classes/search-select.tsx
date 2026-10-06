"use client";

import { useId, useState } from "react";

export interface SearchSelectOption {
  value: string;
  label: string;
  group?: string;
}

/**
 * One labeled control that joins a filter box and a select in a single bordered
 * container. The filter narrows the select's options; the select holds the
 * value. The filter clears when a value is chosen.
 */
export function SearchSelect({
  id,
  label,
  placeholder,
  emptyLabel,
  options,
  value,
  onChange,
  required = false,
  invalid = false,
}: {
  id?: string;
  label: string;
  placeholder: string;
  emptyLabel: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
}) {
  const reactId = useId();
  const selectId = id ?? reactId;
  const [filter, setFilter] = useState("");
  const term = filter.trim().toLowerCase();
  const filtered = term
    ? options.filter((option) => option.label.toLowerCase().includes(term))
    : options;
  // Keep the current selection visible even when the filter would hide it.
  const selected = value
    ? options.find((option) => option.value === value)
    : undefined;
  const visible =
    selected && !filtered.some((option) => option.value === value)
      ? [selected, ...filtered]
      : filtered;
  const groupOrder: string[] = [];
  const grouped = new Map<string, SearchSelectOption[]>();
  for (const option of visible) {
    const key = option.group ?? "";
    if (!grouped.has(key)) {
      grouped.set(key, []);
      groupOrder.push(key);
    }
    grouped.get(key)?.push(option);
  }

  return (
    <div className="field">
      <label htmlFor={selectId}>
        {label}
        {required ? (
          <span className="required-mark" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className={invalid ? "search-select is-invalid" : "search-select"}>
        <input
          type="search"
          className="search-field search-select-filter"
          value={filter}
          placeholder={placeholder}
          aria-label={`Filter ${label}`}
          aria-invalid={invalid || undefined}
          onChange={(event) => setFilter(event.target.value)}
        />
        <select
          id={selectId}
          className="search-select-value"
          value={value}
          required={required}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            onChange(event.target.value);
            setFilter("");
          }}
        >
          <option value="">{emptyLabel}</option>
          {groupOrder.map((group) =>
            group ? (
              <optgroup key={group} label={group}>
                {(grouped.get(group) ?? []).map((option) => (
                  <option key={`${group}:${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              (grouped.get("") ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ),
          )}
        </select>
        {term && visible.length === 0 ? (
          <p className="search-select-empty">No matches</p>
        ) : null}
      </div>
    </div>
  );
}
