"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateDepartmentEndTimeInput } from "@/modules/classes/time";

import type { ActionState } from "./actions";

export function ComponentForm({
  classId,
  action,
  component,
  defaultStartsAt,
}: {
  classId: string;
  component?: {
    id: string;
    title: string | null;
    creditedHours: string;
    startsAt: string;
  };
  defaultStartsAt?: string;
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
  const endTime =
    startsAt && Number(creditedHours) > 0
      ? calculateDepartmentEndTimeInput(startsAt, Number(creditedHours))
      : "";
  return (
    <form action={formAction} className="stack-form">
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
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : component ? "Update session" : "Add session"}
      </Button>
    </form>
  );
}
