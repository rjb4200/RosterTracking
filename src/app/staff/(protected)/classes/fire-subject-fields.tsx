"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  chapterTitleForLessonPlan,
  lessonPlanForChapterChange,
} from "@/modules/classes/fire-subjects";

import { ChapterSelect } from "./chapter-select";
import { CurriculumSelect } from "./curriculum-select";
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

export function FireSubjectRow({
  index,
  value,
  trainingCodes,
  curricula,
  curriculumChapters,
  recentCurriculumIds,
  errors,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  value: FireSubjectValue;
  trainingCodes: Array<{
    id: string;
    code: string;
    title: string;
    isPinned: boolean;
  }>;
  curricula: Array<{
    id: string;
    publisher: string;
    programTitle: string;
    version: string | null;
  }>;
  curriculumChapters: CurriculumChapterOption[];
  recentCurriculumIds: string[];
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
  const categoryError = errors.includes(`fire.${index}.trainingCodeId`);
  const classNameError = errors.includes(`fire.${index}.className`);
  const chapterError = errors.includes(`fire.${index}.curriculumChapter`);
  const categoryOptions = trainingCodes.map((code) => ({
    value: code.id,
    label: `${code.code} — ${code.title}`,
    group: code.isPinned ? "Pinned" : "All codes",
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
      <CurriculumSelect
        id={`fireCurriculum-${index}`}
        curricula={curricula}
        recentCurriculumIds={recentCurriculumIds}
        curriculumId={value.curriculumId}
        curriculumName={value.curriculumName}
        onChange={({ curriculumId, curriculumName }) => {
          const previousTitle = chapterTitleForLessonPlan(
            chapterOptions,
            value.curriculumChapter,
          );
          onChange({
            ...value,
            curriculumId,
            curriculumName,
            curriculumChapter: "",
            lessonPlan: lessonPlanForChapterChange(
              value.lessonPlan,
              previousTitle,
              null,
            ),
          });
        }}
      />
      <ChapterSelect
        key={value.curriculumId}
        id={`fireCurriculumChapter-${index}`}
        chapters={chapterOptions}
        value={value.curriculumChapter}
        invalid={chapterError}
        onChange={(curriculumChapter) => {
          const previousTitle = chapterTitleForLessonPlan(
            chapterOptions,
            value.curriculumChapter,
          );
          const nextTitle = chapterTitleForLessonPlan(
            chapterOptions,
            curriculumChapter,
          );
          onChange({
            ...value,
            curriculumChapter,
            lessonPlan: lessonPlanForChapterChange(
              value.lessonPlan,
              previousTitle,
              nextTitle,
            ),
          });
        }}
      />
      <div className="field">
        <Label htmlFor={`fireLessonPlan-${index}`}>Lesson plan</Label>
        <textarea
          id={`fireLessonPlan-${index}`}
          className="search-input"
          rows={1}
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
