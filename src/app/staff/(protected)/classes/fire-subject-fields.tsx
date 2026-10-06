"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chapterLabel } from "@/modules/classes/fire-subjects";

import { SearchSelect } from "./search-select";

export interface FireSubjectValue {
  id: string;
  trainingCodeId: string;
  className: string;
  curriculumId: string;
  curriculumName: string;
  curriculumChapter: string;
  lessonPlan: string;
}

export interface CurriculumChapterOption {
  curriculumId: string;
  part: string | null;
  number: string;
  title: string;
}

export function newFireSubject(): FireSubjectValue {
  return {
    id: crypto.randomUUID(),
    trainingCodeId: "",
    className: "",
    curriculumId: "",
    curriculumName: "",
    curriculumChapter: "",
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
  curriculumChapters,
  errors,
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
  curriculumChapters: CurriculumChapterOption[];
  errors: string[];
  onChange: (value: FireSubjectValue) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const chapterOptions = value.curriculumId
    ? curriculumChapters.filter(
        (chapter) => chapter.curriculumId === value.curriculumId,
      )
    : [];
  const chapterListId = `fireChapterOptions-${index}`;
  const categoryError = errors.includes(`fire.${index}.trainingCodeId`);
  const classNameError = errors.includes(`fire.${index}.className`);
  const chapterError = errors.includes(`fire.${index}.curriculumChapter`);
  const categoryOptions = trainingCodes.map((code) => ({
    value: code.id,
    label: `${code.code} — ${code.title}`,
  }));
  const curriculumOptions = curricula.map((curriculum) => ({
    value: curriculum.id,
    label: curriculumLabel(curriculum),
  }));

  return (
    <fieldset className="field field-wide">
      <legend>Subject {index + 1}</legend>
      <SearchSelect
        id={`fireTrainingCode-${index}`}
        label="Category"
        placeholder="Search training codes…"
        emptyLabel="Select a training code"
        required
        invalid={categoryError}
        options={categoryOptions}
        value={value.trainingCodeId}
        onChange={(nextId) => {
          const selected = trainingCodes.find((code) => code.id === nextId);
          onChange({
            ...value,
            trainingCodeId: nextId,
            className: selected ? selected.title : value.className,
          });
        }}
      />
      <div className="field">
        <Label htmlFor={`fireClassName-${index}`}>
          Class name
          <span className="required-mark" aria-hidden="true">
            {" "}
            *
          </span>
        </Label>
        <Input
          id={`fireClassName-${index}`}
          value={value.className}
          aria-invalid={classNameError || undefined}
          onChange={(event) =>
            onChange({ ...value, className: event.target.value })
          }
        />
      </div>
      <SearchSelect
        id={`fireCurriculum-${index}`}
        label="Curriculum"
        placeholder="Search approved curricula…"
        emptyLabel="Select a curriculum"
        options={curriculumOptions}
        value={value.curriculumId}
        onChange={(nextId) =>
          onChange({ ...value, curriculumId: nextId, curriculumName: "" })
        }
      />
      <div className="field">
        <Label htmlFor={`fireCurriculumName-${index}`}>
          Curriculum not listed (optional)
        </Label>
        <Input
          id={`fireCurriculumName-${index}`}
          value={value.curriculumName}
          onChange={(event) =>
            onChange({
              ...value,
              curriculumName: event.target.value,
              curriculumId: event.target.value ? "" : value.curriculumId,
            })
          }
        />
      </div>
      <div className="field">
        <Label htmlFor={`fireCurriculumChapter-${index}`}>
          Chapter
          {chapterOptions.length ? (
            <span className="required-mark" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </Label>
        <Input
          id={`fireCurriculumChapter-${index}`}
          list={chapterOptions.length ? chapterListId : undefined}
          value={value.curriculumChapter}
          aria-invalid={chapterError || undefined}
          onChange={(event) =>
            onChange({ ...value, curriculumChapter: event.target.value })
          }
        />
        {chapterOptions.length ? (
          <datalist id={chapterListId}>
            {chapterOptions.map((chapter) => {
              const label = chapterLabel(chapter);
              return <option key={label} value={label} />;
            })}
          </datalist>
        ) : null}
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
