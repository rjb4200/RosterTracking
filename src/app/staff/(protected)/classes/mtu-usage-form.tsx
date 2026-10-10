"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { MtuUsage } from "@/modules/classes/mtu";
import { updateMtuUsageAction } from "./actions";
import { type MtuCatalogOption, MtuUsageFields } from "./mtu-usage-fields";

export function MtuUsageForm({
  classId,
  usage,
  mtuCatalog = [],
  activeParticipants = 0,
}: {
  classId: string;
  usage: MtuUsage | null;
  mtuCatalog?: MtuCatalogOption[];
  activeParticipants?: number;
}) {
  const [state, action, pending] = useActionState(
    updateMtuUsageAction,
    undefined,
  );
  return (
    <form action={action} className="stack-form" aria-label="MTU usage">
      <input type="hidden" name="classId" value={classId} />
      <MtuUsageFields
        catalog={mtuCatalog}
        items={usage?.items ?? []}
        activeParticipants={activeParticipants}
      />
      <label className="field">
        Equipment used (not listed)
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
        Supplies used (not listed)
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
