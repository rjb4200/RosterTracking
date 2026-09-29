"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

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
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="formType" value={formType} />
      <label
        className="sr-only"
        htmlFor={`${formType}-${revisionId}-recipient`}
      >
        Email recipient for {formType.toUpperCase()}
      </label>
      <input
        id={`${formType}-${revisionId}-recipient`}
        name="recipient"
        type="email"
        className="search-input"
        placeholder="recipient@example.com"
        readOnly={confirming}
        required
      />
      {confirming ? (
        <>
          <Button type="submit" variant="secondary" disabled={pending}>
            Confirm send {formType.toUpperCase()}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirming(true)}
        >
          Email {formType.toUpperCase()}
        </Button>
      )}
      {state?.error ? (
        <p className="form-error" aria-live="polite">
          {state.error}
        </p>
      ) : null}
      {state?.success ? <p aria-live="polite">{state.success}</p> : null}
    </form>
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
