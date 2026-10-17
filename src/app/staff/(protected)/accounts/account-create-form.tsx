"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";

import { accountAction } from "./actions";

const roles = [
  [ROLE_CODES.INSTRUCTOR, "Instructor"],
  [ROLE_CODES.TRAINING_MAJOR, "Training Major"],
  [ROLE_CODES.ADMINISTRATOR, "Administrator"],
] as const;

export function AccountCreateForm() {
  const [state, action, pending] = useActionState(accountAction, undefined);
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="operation" value="create" />
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="new-username">Username</Label>
          <Input id="new-username" name="username" required />
        </div>
        <div className="field">
          <Label htmlFor="new-email">Email (optional)</Label>
          <Input id="new-email" name="email" type="email" />
        </div>
        <div className="field">
          <Label htmlFor="new-displayName">Display name</Label>
          <Input id="new-displayName" name="displayName" required />
        </div>
        <div className="field">
          <Label htmlFor="new-password">Initial password</Label>
          <Input id="new-password" name="password" type="password" required />
        </div>
        <div className="field">
          <Label htmlFor="new-roleCode">Account level</Label>
          <select
            id="new-roleCode"
            name="roleCode"
            className="select-input"
            required
          >
            {roles.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? <p aria-live="polite">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
