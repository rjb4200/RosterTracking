"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MtuUsage } from "@/modules/classes/mtu";
import { updateMtuUsageAction } from "./actions";
import {
  type MtuCatalogOption,
  MtuUsageFields,
  mtuUsageValueFromDetail,
} from "./mtu-usage-fields";

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
  const [value, setValue] = useState(() => mtuUsageValueFromDetail(usage));
  return (
    <form action={action} className="stack-form" aria-label="MTU usage">
      <input type="hidden" name="classId" value={classId} />
      <MtuUsageFields
        catalog={mtuCatalog}
        mode="confirm"
        value={value}
        onChange={setValue}
        activeParticipants={activeParticipants}
      />
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
