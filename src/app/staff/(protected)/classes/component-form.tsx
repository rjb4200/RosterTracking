"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chapterLabel } from "@/modules/classes/fire-subjects";
import {
  calculateDepartmentEndTimeInput,
  parseDepartmentDateTime,
  roundDepartmentDateTimeToQuarterHour,
} from "@/modules/classes/time";

import type { ActionState } from "./actions";
import type { CurriculumChapterOption } from "./fire-subject-fields";

export function ComponentForm({
  classId,
  action,
  component,
  defaultStartsAt,
  trainingCodes = [],
  curricula = [],
  curriculumChapters = [],
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
  trainingCodes?: Array<{ id: string; code: string; title: string }>;
  curricula?: Array<{
    id: string;
    publisher: string;
    programTitle: string;
    version: string | null;
  }>;
  curriculumChapters?: CurriculumChapterOption[];
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const suffix = component?.id ?? "new";
  const [startsAt, setStartsAt] = useState(
    component?.startsAt ?? defaultStartsAt ?? "",
  );
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
  const chapterOptions = curriculumId
    ? curriculumChapters.filter(
        (chapter) => chapter.curriculumId === curriculumId,
      )
    : [];
  const chapterListId = `curriculumChapterOptions-${suffix}`;
  const endTime =
    startsAt && Number(creditedHours) > 0
      ? calculateDepartmentEndTimeInput(startsAt, Number(creditedHours))
      : "";
  return (
    <form action={formAction} className="stack-form component-form">
      <input type="hidden" name="classId" value={classId} />
      {component ? (
        <input type="hidden" name="id" value={component.id} />
      ) : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor={`title-${suffix}`}>Session title</Label>
          <Input
            id={`title-${suffix}`}
            name="title"
            defaultValue={component?.title ?? ""}
          />
        </div>
        <div className="field">
          <Label htmlFor={`creditedHours-${suffix}`}>Credited hours</Label>
          <Input
            id={`creditedHours-${suffix}`}
            name="creditedHours"
            type="number"
            step="0.25"
            min="0.25"
            value={creditedHours}
            onChange={(event) => setCreditedHours(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <Label htmlFor={`startsAt-${suffix}`}>Starts</Label>
          <Input
            id={`startsAt-${suffix}`}
            name="startsAt"
            type="datetime-local"
            step="900"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            onBlur={(event) =>
              setStartsAt(
                event.target.value
                  ? roundDepartmentDateTimeToQuarterHour(
                      parseDepartmentDateTime(event.target.value),
                    )
                  : "",
              )
            }
            required
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
            {trainingCodes.map((code) => (
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
        <div className="field">
          <Label htmlFor={`curriculumId-${suffix}`}>Curriculum</Label>
          <select
            id={`curriculumId-${suffix}`}
            name="curriculumId"
            className="select-input"
            value={curriculumId}
            onChange={(event) => {
              setCurriculumId(event.target.value);
              setCurriculumName("");
            }}
          >
            <option value="">No curriculum</option>
            {curricula.map((curriculum) => (
              <option key={curriculum.id} value={curriculum.id}>
                {curriculum.publisher} — {curriculum.programTitle}
                {curriculum.version ? ` (${curriculum.version})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor={`curriculumName-${suffix}`}>
            Book not listed (optional)
          </Label>
          <Input
            id={`curriculumName-${suffix}`}
            name="curriculumName"
            value={curriculumName}
            onChange={(event) => {
              setCurriculumName(event.target.value);
              if (event.target.value) setCurriculumId("");
            }}
          />
        </div>
        <div className="field">
          <Label htmlFor={`curriculumChapter-${suffix}`}>Chapter</Label>
          <Input
            id={`curriculumChapter-${suffix}`}
            name="curriculumChapter"
            list={chapterOptions.length ? chapterListId : undefined}
            value={curriculumChapter}
            onChange={(event) => setCurriculumChapter(event.target.value)}
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
          <Label htmlFor={`method-${suffix}`}>Method</Label>
          <select
            id={`method-${suffix}`}
            name="method"
            className="select-input"
            defaultValue={component?.method ?? ""}
          >
            <option value="">No method</option>
            <option value="cr">Classroom (CR)</option>
            <option value="ho">Hands-on (HO)</option>
            <option value="ol">Online (OL)</option>
            <option value="cr,ol">Hybrid (CR + OL)</option>
          </select>
        </div>
        <div className="field field-wide">
          <Label htmlFor={`lessonPlan-${suffix}`}>Lesson plan</Label>
          <textarea
            id={`lessonPlan-${suffix}`}
            className="search-input"
            name="lessonPlan"
            rows={2}
            defaultValue={component?.lessonPlan ?? ""}
          />
        </div>
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : component ? "Update session" : "Add session"}
      </Button>
    </form>
  );
}
