"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";

import { type AccountActionState, accountAction } from "./actions";

const roles = [
  [ROLE_CODES.INSTRUCTOR, "Instructor"],
  [ROLE_CODES.TRAINING_MAJOR, "Training Major"],
  [ROLE_CODES.ADMINISTRATOR, "Administrator"],
] as const;

function Status({ state }: { state: AccountActionState | undefined }) {
  return (
    <p
      className={state?.error ? "form-error" : "form-success"}
      aria-live="polite"
    >
      {state?.error ?? state?.success}
    </p>
  );
}

function RoleSelect({ id, value }: { id?: string; value?: string }) {
  return (
    <select
      className="select-input"
      defaultValue={value}
      id={id}
      name="roleCode"
      required
    >
      {roles.map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function AccountControls({
  accounts,
}: {
  accounts: Array<{
    id: string;
    username: string;
    displayName: string;
    isActive: boolean;
    roleCodes: string[];
  }>;
}) {
  const [state, action, pending] = useActionState(accountAction, undefined);
  return (
    <>
      <Status state={state} />
      <form action={action} className="stack-form roster-form">
        <input type="hidden" name="operation" value="create" />
        <h2>Create staff account</h2>
        <label className="field">
          Username <input className="search-input" name="username" required />
        </label>
        <label className="field">
          Display name{" "}
          <input className="search-input" name="displayName" required />
        </label>
        <label className="field">
          Initial password{" "}
          <input
            className="search-input"
            name="password"
            type="password"
            required
          />
        </label>
        <label className="field" htmlFor="new-account-role">
          Account level <RoleSelect id="new-account-role" />
        </label>
        <Button type="submit" disabled={pending}>
          Create account
        </Button>
      </form>
      <section className="admin-section">
        <h2>Staff accounts</h2>
        <div className="stack-form">
          {accounts.map((account) => (
            <form action={action} className="inline-form" key={account.id}>
              <input type="hidden" name="operation" value="update" />
              <input type="hidden" name="userId" value={account.id} />
              <strong>
                {account.displayName} ({account.username})
              </strong>
              <RoleSelect value={account.roleCodes[0]} />
              <select
                className="select-input"
                name="isActive"
                defaultValue={String(account.isActive)}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <input
                className="search-input"
                name="password"
                placeholder="New password (optional)"
                type="password"
              />
              <Button type="submit" variant="secondary" disabled={pending}>
                Save
              </Button>
            </form>
          ))}
        </div>
      </section>
    </>
  );
}
