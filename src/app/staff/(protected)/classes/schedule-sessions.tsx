"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHours } from "@/modules/classes/time";

import type { ActionState } from "./actions";
import { ClassMethodForm } from "./class-method-form";
import { ComponentForm } from "./component-form";
import type { CurriculumChapterOption } from "./fire-subject-fields";
import { useWorkspace } from "./workspace-areas";

const FORM_ID = "subject-form";

export type ScheduleSession = {
  id: string;
  title: string | null;
  creditedHours: string;
  startsAtInput: string;
  startsAtLabel: string;
  endsAtInput: string;
  endsAtLabel: string;
  trainingCodeId: string | null;
  className: string | null;
  curriculumId: string | null;
  curriculumName: string | null;
  curriculumChapter: string | null;
  lessonPlan: string | null;
};

export type ScheduleEditor = {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  methodAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  deliveryMethod: string;
  trainingCodes: Array<{
    id: string;
    code: string;
    title: string;
    kind?: string;
  }>;
  trainingCodeKind?: string;
  curricula: Array<{
    id: string;
    publisher: string;
    programTitle: string;
    version: string | null;
  }>;
  curriculumChapters: CurriculumChapterOption[];
  recentCurriculumIds: string[];
  defaultStartsAt: string;
};

/** Shows one editable subject while keeping the remaining subjects compact. */
export function ScheduleSessions({
  classId,
  sessions,
  editor,
}: {
  classId: string;
  sessions: ScheduleSession[];
  editor?: ScheduleEditor;
}) {
  const canAddSubject = Boolean(editor) && sessions.length < 2;
  const { confirmDiscard } = useWorkspace();
  const [selected, setSelected] = useState(() =>
    editor ? (sessions[0]?.id ?? (canAddSubject ? "new" : "")) : "",
  );
  const selectedSession = sessions.find((session) => session.id === selected);
  const newStartsAt =
    sessions[sessions.length - 1]?.endsAtInput ?? editor?.defaultStartsAt ?? "";

  const choose = (next: string) => {
    if (next === selected) return;
    confirmDiscard(() => setSelected(next));
  };

  return (
    <>
      {editor ? (
        <ClassMethodForm
          classId={classId}
          value={editor.deliveryMethod}
          action={editor.methodAction}
        />
      ) : null}
      <ul className="member-list">
        {sessions.map((session) => {
          const isEditing = Boolean(editor) && session.id === selected;
          return (
            <li
              key={session.id}
              className={isEditing ? "member-row is-editing" : "member-row"}
              aria-current={isEditing ? "true" : undefined}
            >
              <span>{session.title ?? "Training subject"}</span>
              <span>
                {session.startsAtLabel} to {session.endsAtLabel}
              </span>
              <Badge variant="outline">
                {formatHours(session.creditedHours)}
              </Badge>
              {editor ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => choose(session.id)}
                >
                  {isEditing ? "Editing" : "Edit"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {editor && canAddSubject ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => choose("new")}
        >
          Add subject
        </Button>
      ) : null}
      {editor && canAddSubject && (selected === "new" || !selectedSession) ? (
        <ComponentForm
          key="new"
          classId={classId}
          action={editor.action}
          formId={FORM_ID}
          hideSubmit
          defaultStartsAt={newStartsAt}
          trainingCodes={editor.trainingCodes}
          trainingCodeKind={editor.trainingCodeKind}
          curricula={editor.curricula}
          curriculumChapters={editor.curriculumChapters}
          recentCurriculumIds={editor.recentCurriculumIds}
        />
      ) : null}
      {editor && selectedSession && selected !== "new" ? (
        <ComponentForm
          key={selectedSession.id}
          classId={classId}
          action={editor.action}
          formId={FORM_ID}
          hideSubmit
          component={{
            id: selectedSession.id,
            title: selectedSession.title,
            creditedHours: selectedSession.creditedHours,
            startsAt: selectedSession.startsAtInput,
            trainingCodeId: selectedSession.trainingCodeId,
            className: selectedSession.className,
            curriculumId: selectedSession.curriculumId,
            curriculumName: selectedSession.curriculumName,
            curriculumChapter: selectedSession.curriculumChapter,
            lessonPlan: selectedSession.lessonPlan,
          }}
          trainingCodes={editor.trainingCodes}
          trainingCodeKind={editor.trainingCodeKind}
          curricula={editor.curricula}
          curriculumChapters={editor.curriculumChapters}
          recentCurriculumIds={editor.recentCurriculumIds}
        />
      ) : null}
    </>
  );
}
