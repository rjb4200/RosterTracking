"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

import type { CertificateResendActionState } from "./actions";

export type NoticeState =
  | "delivered"
  | "queued"
  | "failed"
  | "skipped"
  | "undeliverable"
  | "not_sent";

export interface NoticeParticipantView {
  attendanceId: string;
  name: string;
  agencyName: string;
  email: string | null;
  state: NoticeState;
}

const STATE_LABELS: Record<NoticeState, string> = {
  delivered: "Delivered",
  queued: "Queued",
  failed: "Failed",
  skipped: "Unchanged — not re-sent",
  undeliverable: "No email",
  not_sent: "Not sent",
};

function EmailControl({
  revisionId,
  classId,
  participant,
  action,
}: {
  revisionId: string;
  classId: string;
  participant: NoticeParticipantView;
  action: (
    previous: CertificateResendActionState | undefined,
    formData: FormData,
  ) => Promise<CertificateResendActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state?.success]);

  if (!open) {
    return (
      <div className="inline-form">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Email
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
        htmlFor={`${participant.attendanceId}-variant`}
      >
        Notice variant for {participant.name}
      </label>
      <select
        id={`${participant.attendanceId}-variant`}
        name="variant"
        className="select-input"
        defaultValue="yellow"
      >
        <option value="yellow">Yellow</option>
        <option value="white">White</option>
      </select>
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
        Send notice
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

/** Per-participant training notice view and on-demand email controls. */
export function TrainingNoticeControls({
  revisionId,
  classId,
  participants,
  action,
}: {
  revisionId: string;
  classId: string;
  participants: NoticeParticipantView[];
  action: (
    previous: CertificateResendActionState | undefined,
    formData: FormData,
  ) => Promise<CertificateResendActionState>;
}) {
  return (
    <ul className="member-list">
      {participants.map((participant) => (
        <li key={participant.attendanceId} className="member-row">
          <span>{participant.name}</span>
          <span className="text-muted-foreground">
            {participant.agencyName}
          </span>
          <Badge
            variant={
              participant.state === "failed" ? "destructive" : "secondary"
            }
          >
            {STATE_LABELS[participant.state]}
          </Badge>
          <div className="member-actions">
            <Link
              href={`/api/staff/training-notices/${revisionId}/${participant.attendanceId}?variant=yellow&disposition=inline`}
              target="_blank"
              className={buttonVariants({ variant: "outline" })}
            >
              View yellow
            </Link>
            <EmailControl
              revisionId={revisionId}
              classId={classId}
              participant={participant}
              action={action}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
