"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { curriculumSearchOptions } from "@/modules/classes/fire-subjects";

import { SearchSelect } from "./search-select";

// A sentinel value; never a real curriculum id.
const NOT_LISTED = "__not_listed__";

/**
 * The Fire subject curriculum as one either/or control: an approved-curriculum
 * selection, or a free-text name revealed by the "Not listed" option. Choosing
 * one clears the other.
 */
export function CurriculumSelect({
  id,
  curricula,
  recentCurriculumIds,
  curriculumId,
  curriculumName,
  onChange,
  invalid = false,
}: {
  id?: string;
  curricula: Array<{
    id: string;
    publisher: string;
    programTitle: string;
    version: string | null;
  }>;
  recentCurriculumIds: string[];
  curriculumId: string;
  curriculumName: string;
  onChange: (value: { curriculumId: string; curriculumName: string }) => void;
  invalid?: boolean;
}) {
  const reactId = useId();
  const nameId = `${id ?? reactId}-name`;
  const [other, setOther] = useState(Boolean(curriculumName));
  const options = [
    ...curriculumSearchOptions(curricula, recentCurriculumIds),
    { value: NOT_LISTED, label: "Not listed (type one)", pinned: true },
  ];

  return (
    <SearchSelect
      id={id}
      label="Curriculum"
      placeholder="Search approved curricula…"
      emptyLabel="Select a curriculum"
      options={options}
      value={other ? NOT_LISTED : curriculumId}
      invalid={invalid}
      onChange={(next) => {
        if (next === NOT_LISTED) {
          setOther(true);
          onChange({ curriculumId: "", curriculumName: "" });
        } else {
          setOther(false);
          onChange({ curriculumId: next, curriculumName: "" });
        }
      }}
      footer={
        other ? (
          <div className="field">
            <Label htmlFor={nameId}>Curriculum name</Label>
            <Input
              id={nameId}
              value={curriculumName}
              onChange={(event) =>
                onChange({
                  curriculumId: "",
                  curriculumName: event.target.value,
                })
              }
            />
          </div>
        ) : null
      }
    />
  );
}
