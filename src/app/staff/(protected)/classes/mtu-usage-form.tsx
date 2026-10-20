"use client";

import { useActionState, useState } from "react";

import type { MtuUsage } from "@/modules/classes/mtu";

import { updateMtuUsageAction } from "./actions";
import {
  type MtuCatalogOption,
  MtuUsageFields,
  mtuUsageValueFromDetail,
} from "./mtu-usage-fields";
import { useAreaForm, useCloseOnSaved, useWorkspace } from "./workspace-areas";

const FORM_ID = "mtu-usage-form";

/**
 * The Mobile Training Unit supplies and equipment for the post-class workspace.
 * Its submit lives in the area header; saving records the operational usage
 * without changing the signed roster.
 */
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
  const { setDirty } = useWorkspace();
  useAreaForm(FORM_ID);
  useCloseOnSaved(state?.success);
  const [value, setValue] = useState(() => mtuUsageValueFromDetail(usage));
  return (
    <form
      action={action}
      className="stack-form"
      id={FORM_ID}
      aria-label="MTU usage"
      onChange={() => setDirty(true)}
    >
      <input type="hidden" name="classId" value={classId} />
      <MtuUsageFields
        catalog={mtuCatalog}
        mode="confirm"
        value={value}
        onChange={setValue}
        activeParticipants={activeParticipants}
      />
      <p
        aria-live="polite"
        className={state?.error ? "form-error" : "form-success"}
      >
        {state?.error ?? state?.success}
      </p>
      {pending ? (
        <p className="roster-note" aria-live="polite">
          Saving...
        </p>
      ) : null}
    </form>
  );
}
