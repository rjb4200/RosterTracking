"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { MtuUsage } from "@/modules/classes/mtu";
import { updateMtuUsageAction } from "./actions";

export function MtuUsageForm({
  classId,
  usage,
}: {
  classId: string;
  usage: MtuUsage | null;
}) {
  const [state, action, pending] = useActionState(
    updateMtuUsageAction,
    undefined,
  );
  return (
    <form action={action} className="stack-form" aria-label="MTU usage">
      <input type="hidden" name="classId" value={classId} />
      <label className="field">
        Equipment used
        <textarea
          name="equipmentUsed"
          className="search-input"
          maxLength={500}
          defaultValue={usage?.equipmentUsed ?? ""}
        />
      </label>
      <label className="field">
        Mileage
        <input
          name="mileage"
          className="search-input"
          maxLength={200}
          defaultValue={usage?.mileage ?? ""}
        />
      </label>
      <label className="field">
        Supplies used
        <textarea
          name="usedSupplies"
          className="search-input"
          maxLength={500}
          defaultValue={usage?.usedSupplies ?? ""}
        />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        Save MTU usage
      </Button>
      <p
        aria-live="polite"
        className={state?.error ? "form-error" : "form-success"}
      >
        {state?.error ?? state?.success}
      </p>
    </form>
  );
}
