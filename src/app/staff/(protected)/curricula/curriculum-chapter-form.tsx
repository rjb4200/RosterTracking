"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ActionState } from "./actions";

export function ChapterForm({
  action,
  curriculumId,
  submitLabel = "Add chapter",
  sections = [],
  values,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  curriculumId: string;
  submitLabel?: string;
  sections?: string[];
  values?: {
    id: string;
    part: string;
    number: string;
    title: string;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const suffix = values?.id ?? `new-${curriculumId}`;
  const listId = `chapterSections-${suffix}`;
  return (
    <form action={formAction} className="stack-form">
      <input type="hidden" name="curriculumId" value={curriculumId} />
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor={`part-${suffix}`}>Section</Label>
          <Input
            id={`part-${suffix}`}
            name="part"
            defaultValue={values?.part ?? ""}
            placeholder="Optional"
            list={sections.length ? listId : undefined}
          />
          {sections.length ? (
            <datalist id={listId}>
              {sections.map((section) => (
                <option key={section} value={section} />
              ))}
            </datalist>
          ) : null}
        </div>
        <div className="field">
          <Label htmlFor={`number-${suffix}`}>Number</Label>
          <Input
            id={`number-${suffix}`}
            name="number"
            defaultValue={values?.number}
            required
          />
        </div>
        <div className="field field-wide">
          <Label htmlFor={`title-${suffix}`}>Title</Label>
          <Input
            id={`title-${suffix}`}
            name="title"
            defaultValue={values?.title}
            required
          />
        </div>
      </div>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
