"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  chapterTitleForLessonPlan,
  lessonPlanForChapterChange,
} from "@/modules/classes/fire-subjects";
import { calculateDepartmentEndTimeInput } from "@/modules/classes/time";

import type { ActionState } from "./actions";
import { ChapterSelect } from "./chapter-select";
import { CurriculumSelect } from "./curriculum-select";
import { DurationFields } from "./duration-fields";
import type { CurriculumChapterOption } from "./fire-subject-fields";
import { useAreaForm, useCloseOnSaved, useWorkspace } from "./workspace-areas";

export function ComponentForm({
  classId,
  action,
  component,
  defaultStartsAt,
  formId,
  hideSubmit = false,
  trainingCodes = [],
  trainingCodeKind,
  curricula = [],
  curriculumChapters = [],
  recentCurriculumIds = [],
}: {
  classId: string;
  component?: {
    id: string;
    title: string | null;
    creditedHours: string;
    startsAt: string;
    trainingCodeId?: string | null;
    className?: string | null;
    curriculumId?: string | null;
    curriculumName?: string | null;
    curriculumChapter?: string | null;
    lessonPlan?: string | null;
    method?: string | null;
  };
  defaultStartsAt?: string;
  formId?: string;
  hideSubmit?: boolean;
  trainingCodes?: Array<{
    id: string;
    code: string;
    title: string;
    kind?: string;
  }>;
  trainingCodeKind?: string;
  curricula?: Array<{
    id: string;
    publisher: string;
    programTitle: string;
    version: string | null;
  }>;
  curriculumChapters?: CurriculumChapterOption[];
  recentCurriculumIds?: string[];
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { setDirty } = useWorkspace();
  useAreaForm(formId);
  useCloseOnSaved(state?.classId);
  const suffix = component?.id ?? "new";
  const categoryOptions = trainingCodeKind
    ? trainingCodes.filter((code) => code.kind === trainingCodeKind)
    : trainingCodes;
  const startsAt = component?.startsAt ?? defaultStartsAt ?? "";
  const [creditedHours, setCreditedHours] = useState(
    component?.creditedHours ?? "2.00",
  );
  const [curriculumId, setCurriculumId] = useState(
    component?.curriculumId ?? "",
  );
  const [curriculumName, setCurriculumName] = useState(
    component?.curriculumName ?? "",
  );
  const [curriculumChapter, setCurriculumChapter] = useState(
    component?.curriculumChapter ?? "",
  );
  const [lessonPlan, setLessonPlan] = useState(component?.lessonPlan ?? "");
  const chapterOptions = curriculumId
    ? curriculumChapters.filter(
        (chapter) => chapter.curriculumId === curriculumId,
      )
    : [];
  const endTime =
    startsAt && Number(creditedHours) > 0
      ? calculateDepartmentEndTimeInput(startsAt, Number(creditedHours))
      : "";
  return (
    <form
      action={formAction}
      className="stack-form component-form"
      id={formId}
      onChange={() => setDirty(true)}
    >
      <input type="hidden" name="classId" value={classId} />
      {component ? (
        <input type="hidden" name="id" value={component.id} />
      ) : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor={`title-${suffix}`}>Subject title</Label>
          <Input
            id={`title-${suffix}`}
            name="title"
            defaultValue={component?.title ?? ""}
          />
        </div>
        <DurationFields
          fieldLabel="Credited hours"
          value={creditedHours}
          onChange={setCreditedHours}
          name="creditedHours"
        />
        <div className="field">
          <Label htmlFor={`startsAt-${suffix}`}>Starts</Label>
          <Input
            id={`startsAt-${suffix}`}
            name="startsAt"
            type="datetime-local"
            step="900"
            value={startsAt}
            readOnly
          />
        </div>
        <div className="field">
          <Label htmlFor={`endsAt-${suffix}`}>Ends</Label>
          <Input
            id={`endsAt-${suffix}`}
            name="endsAt"
            type="datetime-local"
            value={endTime}
            readOnly
          />
        </div>
        <div className="field">
          <Label htmlFor={`trainingCodeId-${suffix}`}>Category</Label>
          <select
            id={`trainingCodeId-${suffix}`}
            name="trainingCodeId"
            className="select-input"
            defaultValue={component?.trainingCodeId ?? ""}
          >
            <option value="">No category</option>
            {categoryOptions.map((code) => (
              <option key={code.id} value={code.id}>
                {code.code} — {code.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor={`className-${suffix}`}>Class name</Label>
          <Input
            id={`className-${suffix}`}
            name="className"
            defaultValue={component?.className ?? ""}
          />
        </div>
        <CurriculumSelect
          id={`curriculumId-${suffix}`}
          curricula={curricula}
          recentCurriculumIds={recentCurriculumIds}
          curriculumId={curriculumId}
          curriculumName={curriculumName}
          onChange={({ curriculumId: nextId, curriculumName: nextName }) => {
            const previousTitle = chapterTitleForLessonPlan(
              chapterOptions,
              curriculumChapter,
            );
            setCurriculumId(nextId);
            setCurriculumName(nextName);
            setCurriculumChapter("");
            setLessonPlan((current) =>
              lessonPlanForChapterChange(current, previousTitle, null),
            );
          }}
        />
        <input type="hidden" name="curriculumId" value={curriculumId} />
        <input type="hidden" name="curriculumName" value={curriculumName} />
        <ChapterSelect
          key={curriculumId}
          id={`curriculumChapter-${suffix}`}
          chapters={chapterOptions}
          value={curriculumChapter}
          name="curriculumChapter"
          onChange={(nextChapter) => {
            const previousTitle = chapterTitleForLessonPlan(
              chapterOptions,
              curriculumChapter,
            );
            const nextTitle = chapterTitleForLessonPlan(
              chapterOptions,
              nextChapter,
            );
            setCurriculumChapter(nextChapter);
            setLessonPlan((current) =>
              lessonPlanForChapterChange(current, previousTitle, nextTitle),
            );
          }}
        />
        <div className="field field-wide">
          <Label htmlFor={`lessonPlan-${suffix}`}>Lesson plan</Label>
          <textarea
            id={`lessonPlan-${suffix}`}
            className="search-input"
            name="lessonPlan"
            rows={1}
            value={lessonPlan}
            onChange={(event) => setLessonPlan(event.target.value)}
          />
        </div>
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {hideSubmit ? (
        pending ? (
          <p className="roster-note" aria-live="polite">
            Saving...
          </p>
        ) : null
      ) : (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : component ? "Update subject" : "Add subject"}
        </Button>
      )}
    </form>
  );
}
