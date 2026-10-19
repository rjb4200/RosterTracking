"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MtuUsageItem } from "@/modules/classes/mtu";

import type { ActionState } from "./actions";
import {
  type MtuCatalogOption,
  MtuUsageFields,
  mtuUsageValueFromDetail,
} from "./mtu-usage-fields";

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
  const [reportingSystemIds, setReportingSystemIds] = useState(
    values?.reportingSystemIds ?? [],
  );
  const emsCategories = trainingCodes.filter(
    (category) => category.kind === "ems",
  );
  const [mtuUsage, setMtuUsage] = useState(() =>
    mtuUsageValueFromDetail(values?.mtuUsage),
  );

  return (
    <form action={formAction} className="stack-form">
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
        <div className="field">
          <Label htmlFor="deliveryMethod">Delivery</Label>
          <select
            id="deliveryMethod"
            name="deliveryMethod"
            className="select-input"
            defaultValue={values?.deliveryMethod ?? "classroom"}
          >
            <option value="classroom">Classroom</option>
            <option value="hands_on">Hands-On</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div className="field">
          <Label htmlFor="trainingSiteId">Training site</Label>
          <select
            id="trainingSiteId"
            name="trainingSiteId"
            className="select-input"
            defaultValue={values?.trainingSiteId ?? ""}
          >
            <option value="">No site (online only)</option>
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
            rows={3}
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
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save class details"}
      </Button>
    </form>
  );
}
