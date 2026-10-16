"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ActionState } from "./actions";

export function TrainingCodeForm({
  action,
  submitLabel = "Add training code",
  values,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  submitLabel?: string;
  values?: {
    id: string;
    kind: string;
    code: string;
    title: string;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const suffix = values?.id ?? "new";
  return (
    <form action={formAction} className="stack-form">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor={`kind-${suffix}`}>Category type</Label>
          <select
            id={`kind-${suffix}`}
            name="kind"
            className="select-input"
            defaultValue={values?.kind ?? "fire"}
            required
          >
            <option value="fire">Fire</option>
            <option value="ems">EMS</option>
          </select>
        </div>
        <div className="field">
          <Label htmlFor={`code-${suffix}`}>Code</Label>
          <Input
            id={`code-${suffix}`}
            name="code"
            defaultValue={values?.code}
            required
          />
        </div>
        <div className="field">
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
