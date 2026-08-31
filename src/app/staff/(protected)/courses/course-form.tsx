"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TrainingCodeOption {
  id: string;
  code: string;
  title: string;
}

export function CourseForm({
  trainingCodes,
  action,
  submitLabel = "Create course",
  values,
}: {
  trainingCodes: TrainingCodeOption[];
  action: (
    prev: { error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  submitLabel?: string;
  values?: {
    id: string;
    name: string;
    description: string | null;
    defaultHours: string | null;
    trainingCodeId: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="stack-form">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="name">Course name</Label>
          <Input id="name" name="name" defaultValue={values?.name} required />
        </div>
        <div className="field">
          <Label htmlFor="trainingCodeId">Training code</Label>
          <select
            id="trainingCodeId"
            name="trainingCodeId"
            className="select-input"
            defaultValue={values?.trainingCodeId ?? ""}
          >
            <option value="">— None —</option>
            {trainingCodes.map((code) => (
              <option key={code.id} value={code.id}>
                {code.code} — {code.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="defaultHours">Default hours</Label>
          <Input
            id="defaultHours"
            name="defaultHours"
            type="number"
            step="0.5"
            min="0"
            defaultValue={values?.defaultHours ?? ""}
          />
        </div>
        <div className="field field-wide">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            name="description"
            defaultValue={values?.description ?? ""}
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
