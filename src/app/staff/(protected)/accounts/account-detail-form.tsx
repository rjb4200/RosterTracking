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

export function AccountDetailForm({
  account,
}: {
  account: {
    id: string;
    displayName: string;
    email: string | null;
    roleCodes: string[];
    isActive: boolean;
  };
}) {
  const [state, action, pending] = useActionState(accountAction, undefined);
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="operation" value="update" />
      <input type="hidden" name="userId" value={account.id} />
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={account.displayName}
            required
          />
        </div>
        <div className="field">
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={account.email ?? ""}
          />
        </div>
        <div className="field">
          <Label htmlFor="roleCode">Account level</Label>
          <select
            id="roleCode"
            name="roleCode"
            className="select-input"
            defaultValue={account.roleCodes[0]}
            required
          >
            {roles.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="isActive">Status</Label>
          <select
            id="isActive"
            name="isActive"
            className="select-input"
            defaultValue={String(account.isActive)}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="field">
          <Label htmlFor="password">New password (optional)</Label>
          <Input id="password" name="password" type="password" />
        </div>
      </div>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? <p aria-live="polite">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
