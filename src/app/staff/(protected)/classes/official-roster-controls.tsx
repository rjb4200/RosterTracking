"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { TEMPLATE_MAPPINGS } from "@/modules/official-roster-pdfs/mappings";

import type { OfficialRosterEmailActionState } from "./actions";

function EmailControl({
  revisionId,
  formType,
  action,
}: {
  revisionId: string;
  formType: string;
  action: (
    previous: OfficialRosterEmailActionState | undefined,
    formData: FormData,
  ) => Promise<OfficialRosterEmailActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const label = formType.toUpperCase();
  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state?.success]);

  if (!open) {
    return (
      <div className="inline-form">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Email {label}
        </Button>
        {state?.success ? <p aria-live="polite">{state.success}</p> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="formType" value={formType} />
      <label
        className="sr-only"
        htmlFor={`${formType}-${revisionId}-recipient`}
      >
        Email recipient for {label}
      </label>
      <input
        id={`${formType}-${revisionId}-recipient`}
        name="recipient"
        type="email"
        className="search-input"
        placeholder="recipient@example.com"
        required
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        Send {label}
      </Button>
      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {state?.error ? (
        <p className="form-error" aria-live="polite">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/** View and progressive Email actions for one official roster form. */
export function RosterDocumentActions({
  revisionId,
  formType,
  emailAction,
}: {
  revisionId: string;
  formType: string;
  emailAction: (
    previous: OfficialRosterEmailActionState | undefined,
    formData: FormData,
  ) => Promise<OfficialRosterEmailActionState>;
}) {
  const href = `/api/staff/official-rosters/${revisionId}/${formType}`;
  return (
    <div className="member-actions">
      <Link
        href={`${href}?disposition=inline`}
        target="_blank"
        className={buttonVariants({ variant: "outline" })}
      >
        View {formType.toUpperCase()}
      </Link>
      <EmailControl
        revisionId={revisionId}
        formType={formType}
        action={emailAction}
      />
    </div>
  );
}

export function CompletionCertificateControls({
  revisionId,
}: {
  revisionId: string;
}) {
  const href = `/api/staff/completion-certificates/${revisionId}`;
  return (
    <section className="inline-form" aria-label="Completion certificates">
      <span>Completion certificates</span>
      <Link
        href={`${href}?disposition=inline`}
        target="_blank"
        className={buttonVariants({ variant: "outline" })}
      >
        View certificates PDF
      </Link>
    </section>
  );
}

export function OfficialRosterControls({
  revisionId,
  emailAction,
  showEmail = true,
}: {
  revisionId: string;
  emailAction: (
    previous: OfficialRosterEmailActionState | undefined,
    formData: FormData,
  ) => Promise<OfficialRosterEmailActionState>;
  showEmail?: boolean;
}) {
  return (
    <section className="inline-form" aria-label="Official roster downloads">
      {Object.values(TEMPLATE_MAPPINGS).map((mapping) => {
        const href = `/api/staff/official-rosters/${revisionId}/${mapping.formType}`;
        return (
          <div key={mapping.formType} className="inline-form">
            <strong>{mapping.formType.toUpperCase()}</strong>
            <Link
              href={`${href}?disposition=inline`}
              target="_blank"
              className={buttonVariants({ variant: "outline" })}
            >
              View {mapping.formType.toUpperCase()} PDF
            </Link>
            {showEmail ? (
              <EmailControl
                revisionId={revisionId}
                formType={mapping.formType}
                action={emailAction}
              />
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
