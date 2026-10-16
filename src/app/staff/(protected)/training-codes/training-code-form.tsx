"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ActionState } from "./actions";

export interface TrainingCodeOption {
  id: string;
  code: string;
  title: string;
  kind: string;
}

function optionLabel(category: TrainingCodeOption): string {
  return category.kind === "fire"
    ? `${category.code} — ${category.title}`
    : category.title;
}

export function TrainingCodeForm({
  action,
  submitLabel = "Add training category",
  categories = [],
  values,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  submitLabel?: string;
  categories?: TrainingCodeOption[];
  values?: {
    id: string;
    kind: string;
    code: string;
    title: string;
    isPinned: boolean;
    mapsToId: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const suffix = values?.id ?? "new";
  const [kind, setKind] = useState(values?.kind ?? "fire");
  const [mapsToId, setMapsToId] = useState(values?.mapsToId ?? "");
  // A category is mapped to one of the opposite kind.
  const mappingOptions = categories.filter(
    (category) => category.kind !== kind,
  );

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
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
              setMapsToId("");
            }}
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
        <div className="field">
          <Label htmlFor={`mapsToId-${suffix}`}>
            Maps to
            <span className="text-muted-foreground">
              {kind === "fire" ? " (EMS category)" : " (Fire category)"}
            </span>
          </Label>
          <select
            id={`mapsToId-${suffix}`}
            name="mapsToId"
            className="select-input"
            value={mapsToId}
            onChange={(event) => setMapsToId(event.target.value)}
          >
            <option value="">No mapping</option>
            {mappingOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {optionLabel(category)}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground">
            Links a matching category in the other type, so filling one on a
            roster pre-fills the other.
          </p>
        </div>
      </div>
      <Label className="checkbox-field field-wide">
        <Input
          type="checkbox"
          name="isPinned"
          defaultChecked={values?.isPinned ?? false}
        />
        Pin to top (listed above a separator)
      </Label>
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
