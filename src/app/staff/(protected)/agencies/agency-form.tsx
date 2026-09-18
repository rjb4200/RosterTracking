"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AgencyForm({
  action,
  submitLabel = "Create agency",
  values,
}: {
  action: (
    prev: { error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  submitLabel?: string;
  values?: {
    id: string;
    name: string;
    type: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="stack-form">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={values?.name} required />
        </div>
        <div className="field">
          <Label htmlFor="type">Type</Label>
          <Input
            id="type"
            name="type"
            defaultValue={values?.type ?? ""}
            placeholder="Fire, EMS, Volunteer..."
          />
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
      </div>
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
