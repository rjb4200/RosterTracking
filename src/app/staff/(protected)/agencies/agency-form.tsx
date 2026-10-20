"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AGENCY_OTHER_SUBTYPE_LABELS,
  AGENCY_OTHER_SUBTYPES,
  AGENCY_TAG_CODES,
} from "@/modules/reference/constants";

const OTHER_SUBTYPE_OPTIONS = Object.values(AGENCY_OTHER_SUBTYPES).map(
  (code) => ({ code, label: AGENCY_OTHER_SUBTYPE_LABELS[code] ?? code }),
);

export function AgencyForm({
  action,
  submitLabel = "Create agency",
  tags,
  values,
  onCreated,
  canSetDefault = false,
  currentDefaultName = null,
  isCurrentDefault = false,
}: {
  action: (
    prev: { error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string; agency?: { id: string; name: string } }>;
  submitLabel?: string;
  tags: { id: string; code: string; name: string }[];
  values?: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    trainingCoordinatorName?: string | null;
    trainingCoordinatorPhone?: string | null;
    trainingCoordinatorEmail?: string | null;
    tagIds: string[];
    otherSubtype: string | null;
    isActive: boolean;
    isDefault: boolean;
  };
  onCreated?: (agency: { id: string; name: string }) => void;
  canSetDefault?: boolean;
  currentDefaultName?: string | null;
  isCurrentDefault?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [isDefault, setIsDefault] = useState(values?.isDefault ?? false);
  const defaultDisabled = Boolean(values && !values.isActive);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () => values?.tagIds ?? [],
  );
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (state?.agency && handled.current !== state) {
      handled.current = state;
      onCreated?.(state.agency);
    }
  }, [state, onCreated]);

  const otherTag = tags.find((tag) => tag.code === AGENCY_TAG_CODES.OTHER);
  const otherSelected = otherTag ? selectedTagIds.includes(otherTag.id) : false;

  function toggleTag(id: string, checked: boolean) {
    setSelectedTagIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((existing) => existing !== id),
    );
  }

  return (
    <form action={formAction} className="stack-form">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={values?.name} required />
        </div>
        <div className="field">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            name="address"
            defaultValue={values?.address ?? ""}
          />
        </div>
        <div className="field">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={values?.city ?? ""} />
        </div>
        <div className="field">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={values?.state ?? "KY"} />
        </div>
        <div className="field">
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" defaultValue={values?.zip ?? ""} />
        </div>
        <div className="field">
          <Label htmlFor="contactName">Contact name</Label>
          <Input
            id="contactName"
            name="contactName"
            defaultValue={values?.contactName ?? ""}
          />
        </div>
        <div className="field">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={values?.phone ?? ""}
          />
        </div>
        <div className="field">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={values?.email ?? ""}
          />
        </div>
        <fieldset className="field field-wide">
          <legend>Training coordinator</legend>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="trainingCoordinatorName">Coordinator name</Label>
              <Input
                id="trainingCoordinatorName"
                name="trainingCoordinatorName"
                defaultValue={values?.trainingCoordinatorName ?? ""}
              />
            </div>
            <div className="field">
              <Label htmlFor="trainingCoordinatorPhone">Phone</Label>
              <Input
                id="trainingCoordinatorPhone"
                name="trainingCoordinatorPhone"
                type="tel"
                defaultValue={values?.trainingCoordinatorPhone ?? ""}
              />
            </div>
            <div className="field">
              <Label htmlFor="trainingCoordinatorEmail">Email</Label>
              <Input
                id="trainingCoordinatorEmail"
                name="trainingCoordinatorEmail"
                type="email"
                defaultValue={values?.trainingCoordinatorEmail ?? ""}
              />
            </div>
          </div>
        </fieldset>
        <fieldset className="field field-wide">
          <legend>Service tags</legend>
          <div className="checkbox-list">
            {tags.map((tag) => (
              <Label key={tag.id} className="checkbox-field">
                <Input
                  type="checkbox"
                  name="tagIds"
                  value={tag.id}
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={(event) => toggleTag(tag.id, event.target.checked)}
                />
                {tag.name}
              </Label>
            ))}
          </div>
        </fieldset>
        {otherSelected ? (
          <div className="field">
            <Label htmlFor="otherSubtype">Other subtype</Label>
            <select
              id="otherSubtype"
              name="otherSubtype"
              className="select-input"
              defaultValue={values?.otherSubtype ?? ""}
            >
              <option value="">None</option>
              {OTHER_SUBTYPE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {canSetDefault ? (
        <fieldset className="field field-wide">
          <legend>Class default</legend>
          <Label className="checkbox-field">
            <Input
              type="checkbox"
              name="isDefault"
              checked={isDefault}
              disabled={defaultDisabled}
              onChange={(event) => setIsDefault(event.target.checked)}
            />
            Default host agency for new classes
          </Label>
          {defaultDisabled ? (
            <p className="text-muted-foreground">
              Reactivate this agency before making it the default.
            </p>
          ) : null}
          {isDefault && currentDefaultName && !isCurrentDefault ? (
            <p className="text-muted-foreground" role="status">
              Saving will replace {currentDefaultName} as the default host
              agency.
            </p>
          ) : null}
          {!isDefault && isCurrentDefault ? (
            <p className="text-muted-foreground" role="status">
              Saving will leave new classes without a default host agency.
            </p>
          ) : null}
        </fieldset>
      ) : null}
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
