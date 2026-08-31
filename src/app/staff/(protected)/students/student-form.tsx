"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface StudentFormValues {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  studentNumber: string;
}

export function StudentForm({
  action,
  values,
  submitLabel,
}: {
  action: (
    prev: { error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string }>;
  values?: StudentFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="stack-form">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={values?.firstName}
            required
          />
        </div>
        <div className="field">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={values?.lastName}
            required
          />
        </div>
        <div className="field">
          <Label htmlFor="phone">Mobile phone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={values?.phone}
            required
          />
        </div>
        <div className="field">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={values?.email}
          />
        </div>
        <div className="field">
          <Label htmlFor="studentNumber">Internal number</Label>
          <Input
            id="studentNumber"
            name="studentNumber"
            defaultValue={values?.studentNumber}
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
