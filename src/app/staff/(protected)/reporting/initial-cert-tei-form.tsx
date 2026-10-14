"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ReportingActionState } from "./actions";

/**
 * A subdued control for the single initial-certification TEI number. Rendered
 * only for administrators; the server action re-checks the administrator role.
 */
export function InitialCertTeiForm({
  tei,
  action,
}: {
  tei: string;
  action: (
    previous: ReportingActionState | undefined,
    formData: FormData,
  ) => Promise<ReportingActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="inline-form">
      <label htmlFor="initial-cert-tei" className="text-muted-foreground">
        Initial certification TEI
      </label>
      <input
        id="initial-cert-tei"
        name="tei"
        className="search-input"
        defaultValue={tei}
        inputMode="numeric"
        maxLength={3}
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        Save
      </Button>
      {state?.error ? (
        <p className="form-error" aria-live="polite">
          {state.error}
        </p>
      ) : null}
      {state?.success ? <p aria-live="polite">{state.success}</p> : null}
    </form>
  );
}
