"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DELIVERY_METHOD_ORDER,
  deliveryMethodLabel,
  formatDeliveryMethods,
  parseDeliveryMethods,
} from "@/modules/classes/delivery-methods";
import type { MtuUsageItem } from "@/modules/classes/mtu";

import type { ActionState } from "./actions";
import {
  type MtuCatalogOption,
  MtuUsageFields,
  mtuUsageValueFromDetail,
} from "./mtu-usage-fields";
import { useAreaForm, useCloseOnSaved, useWorkspace } from "./workspace-areas";

const FORM_ID = "class-details-form";

interface Option {
  id: string;
  name: string;
}

export function ClassForm({
  action,
  sites,
  agencies,
  reportingSystems,
  trainingCodes = [],
  mtuCatalog = [],
  mtuActiveParticipantCount = 0,
  hideMtuUsage = false,
  hideSubmit = false,
  values,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  sites: Option[];
  agencies: Option[];
  reportingSystems: Option[];
  trainingCodes?: Array<{ id: string; title: string; kind: string }>;
  mtuCatalog?: MtuCatalogOption[];
  mtuActiveParticipantCount?: number;
  hideMtuUsage?: boolean;
  hideSubmit?: boolean;
  values?: {
    id: string;
    name: string | null;
    trainingSiteId: string | null;
    hostAgencyId: string | null;
    deliveryMethod: string;
    reportingSystemIds: string[];
    accessPinEnabled: boolean;
    objectives?: string | null;
    courseType?: string | null;
    courseNumber?: string | null;
    emsCategoryId?: string | null;
    mtuUsage?: {
      equipmentUsed: string | null;
      mileage: string | null;
      usedSupplies: string | null;
      items?: MtuUsageItem[];
    } | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { setDirty } = useWorkspace();
  useAreaForm(hideSubmit ? FORM_ID : undefined);
  useCloseOnSaved(state?.classId);
  const [reportingSystemIds, setReportingSystemIds] = useState(
    values?.reportingSystemIds ?? [],
  );
  const [deliveryMethods, setDeliveryMethods] = useState(() =>
    parseDeliveryMethods(values?.deliveryMethod ?? "classroom"),
  );
  const emsCategories = trainingCodes.filter(
    (category) => category.kind === "ems",
  );
  const [mtuUsage, setMtuUsage] = useState(() =>
    mtuUsageValueFromDetail(values?.mtuUsage),
  );

  return (
    <form
      action={formAction}
      className="stack-form"
      id={hideSubmit ? FORM_ID : undefined}
      onChange={() => setDirty(true)}
    >
      {values ? <input type="hidden" name="classId" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="name">Class name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={values?.name ?? ""}
            placeholder="e.g. EMS Continuing Education"
          />
        </div>
        <div className="field field-wide">
          <span className="field-label">Default delivery</span>
          <p className="text-muted-foreground">
            Seeds new sessions. Each session can use a different method.
          </p>
          <div className="checkbox-list">
            {DELIVERY_METHOD_ORDER.map((method) => (
              <Label key={method} className="checkbox-field">
                <Input
                  type="checkbox"
                  checked={deliveryMethods.includes(method)}
                  onChange={(event) =>
                    setDeliveryMethods((current) =>
                      event.target.checked
                        ? [...new Set([...current, method])]
                        : current.filter((value) => value !== method),
                    )
                  }
                />
                {deliveryMethodLabel(method)}
              </Label>
            ))}
          </div>
          <input
            type="hidden"
            name="deliveryMethod"
            value={formatDeliveryMethods(deliveryMethods.join(","))}
          />
          {deliveryMethods.length === 0 ? (
            <p className="form-error">Select at least one delivery method.</p>
          ) : null}
        </div>
        <div className="field">
          <Label htmlFor="trainingSiteId">Training site</Label>
          <select
            id="trainingSiteId"
            name="trainingSiteId"
            className="select-input"
            defaultValue={values?.trainingSiteId ?? ""}
            required
          >
            <option value="" disabled>
              Select a training site
            </option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="hostAgencyId">Host agency</Label>
          <select
            id="hostAgencyId"
            name="hostAgencyId"
            className="select-input"
            defaultValue={values?.hostAgencyId ?? ""}
            required
          >
            <option value="" disabled>
              Select the reporting host agency
            </option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="field field-wide">
          <legend>Reporting systems</legend>
          <div className="checkbox-list">
            {reportingSystems.map((system) => (
              <Label key={system.id} className="checkbox-field">
                <Input
                  type="checkbox"
                  name="reportingSystemIds"
                  value={system.id}
                  checked={reportingSystemIds.includes(system.id)}
                  onChange={(event) =>
                    setReportingSystemIds((current) =>
                      event.target.checked
                        ? [...new Set([...current, system.id])]
                        : current.filter((id) => id !== system.id),
                    )
                  }
                />
                {system.name}
              </Label>
            ))}
          </div>
          <p className="text-muted-foreground">
            Changing reporting systems can invalidate attendance already
            recorded under the previous selection. Correct those records before
            finalizing.
          </p>
        </fieldset>
        <div className="field">
          <Label htmlFor="courseType">Course type</Label>
          <select
            id="courseType"
            name="courseType"
            className="select-input"
            defaultValue={values?.courseType ?? ""}
          >
            <option value="">No course type</option>
            <option value="continuing_education">Continuing education</option>
            <option value="initial_certification">Initial certification</option>
            <option value="refresher">Refresher</option>
          </select>
        </div>
        <div className="field">
          <Label htmlFor="emsCategoryId">EMS category</Label>
          <select
            id="emsCategoryId"
            name="emsCategoryId"
            className="select-input"
            defaultValue={values?.emsCategoryId ?? ""}
          >
            <option value="">No category</option>
            {emsCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="courseNumber">Course number</Label>
          <Input
            id="courseNumber"
            name="courseNumber"
            defaultValue={values?.courseNumber ?? ""}
          />
        </div>
        <div className="field field-wide">
          <Label htmlFor="objectives">Course description or objectives</Label>
          <textarea
            id="objectives"
            className="search-input"
            name="objectives"
            rows={2}
            defaultValue={values?.objectives ?? ""}
          />
        </div>
        {hideMtuUsage ? (
          <input type="hidden" name="mtuManaged" value="false" />
        ) : (
          <MtuUsageFields
            catalog={mtuCatalog}
            mode="select"
            value={mtuUsage}
            onChange={setMtuUsage}
            activeParticipants={mtuActiveParticipantCount}
          />
        )}
        <Label className="checkbox-field field-wide">
          <Input
            defaultChecked={values?.accessPinEnabled ?? false}
            name="accessPinEnabled"
            type="checkbox"
          />
          Require a four-digit student access PIN
        </Label>
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {hideSubmit ? (
        pending ? (
          <p className="roster-note" aria-live="polite">
            Saving...
          </p>
        ) : null
      ) : (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save class details"}
        </Button>
      )}
    </form>
  );
}
