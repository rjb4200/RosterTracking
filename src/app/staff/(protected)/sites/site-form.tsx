"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SiteForm({
  action,
  submitLabel = "Create site",
  values,
  onCreated,
  canSetDefault = false,
  currentDefaultName = null,
  isCurrentDefault = false,
}: {
  action: (
    prev: { error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string; site?: { id: string; name: string } }>;
  submitLabel?: string;
  values?: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    isActive: boolean;
    isDefault: boolean;
  };
  onCreated?: (site: { id: string; name: string }) => void;
  canSetDefault?: boolean;
  currentDefaultName?: string | null;
  isCurrentDefault?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [isDefault, setIsDefault] = useState(values?.isDefault ?? false);
  const defaultDisabled = Boolean(values && !values.isActive);
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (state?.site && handled.current !== state) {
      handled.current = state;
      onCreated?.(state.site);
    }
  }, [state, onCreated]);

  return (
    <form action={formAction} className="stack-form">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="name">Site name</Label>
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
            Default training site for new classes
          </Label>
          {defaultDisabled ? (
            <p className="text-muted-foreground">
              Reactivate this site before making it the default.
            </p>
          ) : null}
          {isDefault && currentDefaultName && !isCurrentDefault ? (
            <p className="text-muted-foreground" role="status">
              Saving will replace {currentDefaultName} as the default training
              site.
            </p>
          ) : null}
          {!isDefault && isCurrentDefault ? (
            <p className="text-muted-foreground" role="status">
              Saving will leave new classes without a default training site.
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
