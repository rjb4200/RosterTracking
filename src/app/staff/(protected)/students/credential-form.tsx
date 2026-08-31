"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CredentialTypeOption {
  id: string;
  name: string;
}

export function CredentialForm({
  studentId,
  types,
  action,
}: {
  studentId: string;
  types: CredentialTypeOption[];
  action: (
    prev: { error?: string } | undefined,
    formData: FormData,
  ) => Promise<{ error?: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="stack-form">
      <input type="hidden" name="studentId" value={studentId} />
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="credentialTypeId">Credential type</Label>
          <select
            id="credentialTypeId"
            name="credentialTypeId"
            required
            defaultValue={types[0]?.id}
            className="select-input"
          >
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="value">Credential number</Label>
          <Input id="value" name="value" required />
        </div>
        <div className="field">
          <Label htmlFor="expirationDate">Expiration (optional)</Label>
          <Input id="expirationDate" name="expirationDate" type="date" />
        </div>
      </div>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save credential"}
      </Button>
    </form>
  );
}
