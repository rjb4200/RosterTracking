"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MtuUsage } from "@/modules/classes/mtu";

import type { ActionState } from "./actions";
import {
  type MtuCatalogOption,
  MtuUsageFields,
  mtuUsageValueFromDetail,
} from "./mtu-usage-fields";

export function FinalizationControls({
  classId,
  status,
  finalizeAction,
  canFinalize = true,
  isLeadInstructor = false,
  isMtuClass = false,
  mtuCatalog = [],
  mtuUsage = null,
  activeParticipants = 0,
}: {
  classId: string;
  status: string;
  finalizeAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  canFinalize?: boolean;
  isLeadInstructor?: boolean;
  isMtuClass?: boolean;
  mtuCatalog?: MtuCatalogOption[];
  mtuUsage?: MtuUsage | null;
  activeParticipants?: number;
}) {
  const [finalizeState, finalizeFormAction, finalizing] = useActionState(
    finalizeAction,
    undefined,
  );
  const [mtuValue, setMtuValue] = useState(() =>
    mtuUsageValueFromDetail(mtuUsage),
  );
  if (status !== "open") return null;
  return (
    <div className="stack-form">
      {finalizeState?.error ? (
        <p className="form-error">{finalizeState.error}</p>
      ) : null}
      {isLeadInstructor ? (
        <form action={finalizeFormAction} className="stack-form">
          <input type="hidden" name="classId" value={classId} />
          {isMtuClass ? (
            <fieldset className="field field-wide">
              <legend>Step 1: Confirm MTU usage</legend>
              <p className="roster-note">
                Confirm or edit the equipment and supplies used. This is
                operational usage and does not change the signed roster.
              </p>
              <MtuUsageFields
                catalog={mtuCatalog}
                mode="confirm"
                value={mtuValue}
                onChange={setMtuValue}
                activeParticipants={activeParticipants}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="mtuConfirmed"
                  value="true"
                  required
                />
                <span>
                  I confirm the MTU equipment, supplies, and transport used for
                  this class.
                </span>
              </label>
            </fieldset>
          ) : null}
          <label className="checkbox-row">
            <input type="checkbox" name="certified" value="true" required />
            <span>
              I certify that this roster is complete and accurate to the best of
              my knowledge.
            </span>
          </label>
          <label htmlFor="finalize-typed-name">Sign with your name</label>
          <input
            id="finalize-typed-name"
            name="typedName"
            className="search-input"
            required
          />
          <Button type="submit" disabled={finalizing || !canFinalize}>
            Finalize and sign roster
          </Button>
        </form>
      ) : (
        <p className="roster-note">
          Only the class&apos;s lead instructor can finalize and sign this
          roster.
        </p>
      )}
    </div>
  );
}

export function ReopenControl({
  classId,
  reopenAction,
}: {
  classId: string;
  reopenAction: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [reopenState, reopenFormAction, reopening] = useActionState(
    reopenAction,
    undefined,
  );
  return (
    <div className="stack-form">
      {reopenState?.error ? (
        <p className="form-error">{reopenState.error}</p>
      ) : null}
      <form action={reopenFormAction} className="inline-form">
        <input type="hidden" name="classId" value={classId} />
        <label htmlFor="reopen-reason">Reopen note</label>
        <input
          id="reopen-reason"
          name="reason"
          className="search-input"
          required
        />
        <Button type="submit" variant="secondary" disabled={reopening}>
          Reopen for correction
        </Button>
      </form>
    </div>
  );
}
