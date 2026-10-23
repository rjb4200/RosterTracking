"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CurriculumChapter,
  chapterSearchOptions,
  chapterSelectionState,
  NOT_LISTED_CHAPTER,
} from "@/modules/classes/fire-subjects";

import { SearchSelect } from "./search-select";

/**
 * A Fire subject or session chapter: a filterable catalog selection grouped by
 * section, with a `Not listed` fallback for a typed chapter. With no catalog
 * chapters the field is optional free text.
 */
export function ChapterSelect({
  id,
  chapters,
  value,
  onChange,
  label = "Chapter",
  name,
  invalid = false,
}: {
  id?: string;
  chapters: readonly CurriculumChapter[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  name?: string;
  invalid?: boolean;
}) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const typedId = `${fieldId}-typed`;
  const [other, setOther] = useState(false);
  const state = chapterSelectionState(chapters, value);
  const showCustom = other || state.custom;
  const required = chapters.length > 0;

  if (!chapters.length) {
    return (
      <div className="field">
        <Label htmlFor={fieldId}>{label}</Label>
        <Input
          id={fieldId}
          name={name}
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  return (
    <SearchSelect
      id={fieldId}
      label={label}
      placeholder="Search chapters…"
      emptyLabel="Select a chapter"
      required={required}
      invalid={invalid}
      options={[
        ...chapterSearchOptions(chapters),
        {
          value: NOT_LISTED_CHAPTER,
          label: "Not listed (type one)",
          pinned: true,
        },
      ]}
      value={showCustom ? NOT_LISTED_CHAPTER : state.selectValue}
      onChange={(next) => {
        if (next === NOT_LISTED_CHAPTER) {
          setOther(true);
          onChange("");
        } else {
          setOther(false);
          onChange(next);
        }
      }}
      footer={
        <>
          {showCustom ? (
            <div className="field">
              <Label htmlFor={typedId}>Chapter name or number</Label>
              <Input
                id={typedId}
                value={value}
                required={required}
                aria-invalid={invalid || undefined}
                onChange={(event) => onChange(event.target.value)}
              />
            </div>
          ) : null}
          {name ? <input type="hidden" name={name} value={value} /> : null}
        </>
      }
    />
  );
}
