"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DELIVERY_METHOD_ORDER,
  deliveryMethodLabel,
  parseDeliveryMethods,
} from "@/modules/classes/delivery-methods";

import type { ActionState } from "./actions";

const METHOD_CODES = {
  classroom: "CR",
  hands_on: "HO",
  online: "OL",
} as const;

/** The class-level KFS method set; saving applies it to every subject. */
export function ClassMethodForm({
  classId,
  value,
  action,
}: {
  classId: string;
  value: string;
  action: (
    previous: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [selected, setSelected] = useState(
    () => new Set(parseDeliveryMethods(value)),
  );
  const deliveryMethod = DELIVERY_METHOD_ORDER.filter((method) =>
    selected.has(method),
  ).join(",");

  return (
    <form action={formAction} className="stack-form">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="deliveryMethod" value={deliveryMethod} />
      <fieldset className="field">
        <legend>Class methods</legend>
        <div className="checkbox-list">
          {DELIVERY_METHOD_ORDER.map((method) => (
            <Label key={method} className="checkbox-field">
              <Input
                type="checkbox"
                checked={selected.has(method)}
                onChange={(event) =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(method);
                    else next.delete(method);
                    return next;
                  })
                }
              />
              {deliveryMethodLabel(method)} ({METHOD_CODES[method]})
            </Label>
          ))}
        </div>
        <p className="roster-note">
          These methods apply to every subject on the class.
        </p>
      </fieldset>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending || selected.size === 0}
      >
        {pending ? "Saving..." : "Save methods"}
      </Button>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? <p role="status">{state.success}</p> : null}
    </form>
  );
}
