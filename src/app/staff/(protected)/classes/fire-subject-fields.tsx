"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FireSubjectValue {
  id: string;
  trainingCodeId: string;
  className: string;
  curriculumId: string;
  lessonPlan: string;
}

export function newFireSubject(): FireSubjectValue {
  return {
    id: crypto.randomUUID(),
    trainingCodeId: "",
    className: "",
    curriculumId: "",
    lessonPlan: "",
  };
}

export function curriculumLabel(curriculum: {
  publisher: string;
  programTitle: string;
  version: string | null;
}): string {
  return `${curriculum.publisher} — ${curriculum.programTitle}${
    curriculum.version ? ` (${curriculum.version})` : ""
  }`;
}

export function FireSubjectRow({
  index,
  value,
  trainingCodes,
  curricula,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  value: FireSubjectValue;
  trainingCodes: Array<{ id: string; code: string; title: string }>;
  curricula: Array<{
    id: string;
    publisher: string;
    programTitle: string;
    version: string | null;
  }>;
  onChange: (value: FireSubjectValue) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [codeFilter, setCodeFilter] = useState("");
  const [curriculumFilter, setCurriculumFilter] = useState("");

  const codeTerm = codeFilter.toLowerCase();
  const filteredCodes = trainingCodes.filter(
    (code) =>
      code.code.toLowerCase().includes(codeTerm) ||
      code.title.toLowerCase().includes(codeTerm),
  );
  const curriculumTerm = curriculumFilter.toLowerCase();
  const filteredCurricula = curricula.filter(
    (curriculum) =>
      curriculum.publisher.toLowerCase().includes(curriculumTerm) ||
      curriculum.programTitle.toLowerCase().includes(curriculumTerm),
  );

  return (
    <fieldset className="field field-wide">
      <legend>Subject {index + 1}</legend>
      <div className="field">
        <Label htmlFor={`fireCodeSearch-${index}`}>Search training code</Label>
        <Input
          id={`fireCodeSearch-${index}`}
          value={codeFilter}
          onChange={(event) => setCodeFilter(event.target.value)}
        />
      </div>
      <div className="field">
        <Label htmlFor={`fireTrainingCode-${index}`}>Category</Label>
        <select
          id={`fireTrainingCode-${index}`}
          className="select-input"
          value={value.trainingCodeId}
          onChange={(event) => {
            const selected = trainingCodes.find(
              (code) => code.id === event.target.value,
            );
            onChange({
              ...value,
              trainingCodeId: event.target.value,
              className: selected ? selected.title : value.className,
            });
          }}
        >
          <option value="">Select a training code</option>
          {filteredCodes.map((code) => (
            <option key={code.id} value={code.id}>
              {code.code} — {code.title}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <Label htmlFor={`fireClassName-${index}`}>Class name</Label>
        <Input
          id={`fireClassName-${index}`}
          value={value.className}
          onChange={(event) =>
            onChange({ ...value, className: event.target.value })
          }
        />
      </div>
      <div className="field">
        <Label htmlFor={`fireCurriculumSearch-${index}`}>
          Search approved curriculum
        </Label>
        <Input
          id={`fireCurriculumSearch-${index}`}
          value={curriculumFilter}
          onChange={(event) => setCurriculumFilter(event.target.value)}
        />
      </div>
      <div className="field">
        <Label htmlFor={`fireCurriculum-${index}`}>Curriculum</Label>
        <select
          id={`fireCurriculum-${index}`}
          className="select-input"
          value={value.curriculumId}
          onChange={(event) =>
            onChange({ ...value, curriculumId: event.target.value })
          }
        >
          <option value="">Select a curriculum</option>
          {filteredCurricula.map((curriculum) => (
            <option key={curriculum.id} value={curriculum.id}>
              {curriculumLabel(curriculum)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <Label htmlFor={`fireLessonPlan-${index}`}>Lesson plan</Label>
        <textarea
          id={`fireLessonPlan-${index}`}
          className="search-input"
          rows={2}
          value={value.lessonPlan}
          onChange={(event) =>
            onChange({ ...value, lessonPlan: event.target.value })
          }
        />
      </div>
      {canRemove ? (
        <Button type="button" variant="outline" onClick={onRemove}>
          Remove subject
        </Button>
      ) : null}
    </fieldset>
  );
}
