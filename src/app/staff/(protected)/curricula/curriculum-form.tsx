"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ActionState } from "./actions";

export function CurriculumForm({
  action,
  submitLabel = "Add curriculum",
  values,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  submitLabel?: string;
  values?: {
    id: string;
    publisher: string;
    programTitle: string;
    version: string | null;
    additionalRequirements: string | null;
    sourceRevision: string;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const suffix = values?.id ?? "new";
  return (
    <form action={formAction} className="stack-form">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor={`publisher-${suffix}`}>Publisher</Label>
          <Input
            id={`publisher-${suffix}`}
            name="publisher"
            defaultValue={values?.publisher}
            required
          />
        </div>
        <div className="field">
          <Label htmlFor={`programTitle-${suffix}`}>Program title</Label>
          <Input
            id={`programTitle-${suffix}`}
            name="programTitle"
            defaultValue={values?.programTitle}
            required
          />
        </div>
        <div className="field">
          <Label htmlFor={`version-${suffix}`}>Version</Label>
          <Input
            id={`version-${suffix}`}
            name="version"
            defaultValue={values?.version ?? ""}
          />
        </div>
        <div className="field">
          <Label htmlFor={`sourceRevision-${suffix}`}>Source revision</Label>
          <Input
            id={`sourceRevision-${suffix}`}
            name="sourceRevision"
            defaultValue={values?.sourceRevision}
            required
          />
        </div>
        <div className="field field-wide">
          <Label htmlFor={`additionalRequirements-${suffix}`}>
            Additional requirements
          </Label>
          <Input
            id={`additionalRequirements-${suffix}`}
            name="additionalRequirements"
            defaultValue={values?.additionalRequirements ?? ""}
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
