"use client";

import { useActionState, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { CertificateResendActionState } from "./actions";

export interface CertificateDeliveryParticipantView {
  attendanceId: string;
  name: string;
  email: string | null;
  state: "delivered" | "queued" | "failed" | "skipped" | "undeliverable";
}

const STATE_LABELS: Record<
  CertificateDeliveryParticipantView["state"],
  string
> = {
  delivered: "Delivered",
  queued: "Queued",
  failed: "Failed",
  skipped: "Unchanged — not re-sent",
  undeliverable: "No email",
};

function ResendControl({
  revisionId,
  classId,
  participant,
  action,
  sendLabel,
}: {
  revisionId: string;
  classId: string;
  participant: CertificateDeliveryParticipantView;
  action: (
    previous: CertificateResendActionState | undefined,
    formData: FormData,
  ) => Promise<CertificateResendActionState>;
  sendLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const label = participant.state === "undeliverable" ? "Send" : "Resend";
  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state?.success]);

  if (!open) {
    return (
      <div className="inline-form">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {label}
        </Button>
        {state?.success ? <p aria-live="polite">{state.success}</p> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="inline-form">
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="classId" value={classId} />
      <input
        type="hidden"
        name="attendanceId"
        value={participant.attendanceId}
      />
      <label
        className="sr-only"
        htmlFor={`${participant.attendanceId}-recipient`}
      >
        Email recipient for {participant.name}
      </label>
      <input
        id={`${participant.attendanceId}-recipient`}
        name="recipient"
        type="email"
        className="search-input"
        placeholder={participant.email ?? "recipient@example.com"}
        defaultValue={participant.email ?? ""}
        required
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {sendLabel}
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

/** Per-participant certificate delivery state with resend and exception actions. */
export function CertificateDeliveryControls({
  revisionId,
  classId,
  participants,
  action,
  sendLabel = "Send certificate",
}: {
  revisionId: string;
  classId: string;
  participants: CertificateDeliveryParticipantView[];
  action: (
    previous: CertificateResendActionState | undefined,
    formData: FormData,
  ) => Promise<CertificateResendActionState>;
  sendLabel?: string;
}) {
  return (
    <ul className="member-list">
      {participants.map((participant) => (
        <li key={participant.attendanceId} className="member-row">
          <span>{participant.name}</span>
          <Badge
            variant={
              participant.state === "failed" ? "destructive" : "secondary"
            }
          >
            {STATE_LABELS[participant.state]}
          </Badge>
          <span className="text-muted-foreground">
            {participant.email ?? "No email on file"}
          </span>
          <ResendControl
            revisionId={revisionId}
            classId={classId}
            participant={participant}
            action={action}
            sendLabel={sendLabel}
          />
        </li>
      ))}
    </ul>
  );
}
