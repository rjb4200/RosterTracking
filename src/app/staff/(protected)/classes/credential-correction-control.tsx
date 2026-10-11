"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CorrectionCredential {
  credentialTypeId: string;
  code: string;
  name: string;
  currentValue: string;
  valid: boolean;
}

export interface CredentialCorrectionActionState {
  error?: string;
  success?: string;
}

/**
 * Lets an authorized operator correct one prompted credential for one attendee.
 * The current value is shown in full so a typo can be seen and fixed, with a
 * flag when the stored value is not valid for its type. Each credential is
 * submitted on its own with a required reason.
 */
export function CredentialCorrectionControl({
  classId,
  attendanceId,
  participantName,
  credentials,
  action,
}: {
  classId: string;
  attendanceId: string;
  participantName: string;
  credentials: CorrectionCredential[];
  action: (
    prev: CredentialCorrectionActionState | undefined,
    formData: FormData,
  ) => Promise<CredentialCorrectionActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  if (credentials.length === 0) return null;

  return (
    <details className="credential-correction">
      <summary>Correct credentials</summary>
      <p className="credential-correction-hint">
        Fixing a credential updates {participantName}&apos;s record and the
        roster. A reason is required.
      </p>
      {credentials.map((credential) => (
        <form
          action={formAction}
          className="credential-correction-form"
          key={credential.credentialTypeId}
        >
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="attendanceId" value={attendanceId} />
          <input
            type="hidden"
            name="credentialTypeId"
            value={credential.credentialTypeId}
          />
          <div className="field">
            <Label
              htmlFor={`correction-${attendanceId}-${credential.credentialTypeId}`}
            >
              {credential.name}
              {credential.valid ? null : (
                <span className="credential-invalid-flag">
                  {" "}
                  · invalid, needs correction
                </span>
              )}
            </Label>
            <Input
              autoComplete="off"
              defaultValue={credential.currentValue}
              id={`correction-${attendanceId}-${credential.credentialTypeId}`}
              name="value"
              placeholder={credential.code === "ffn" ? "0000-0000" : undefined}
              required
            />
          </div>
          <div className="field">
            <Label
              htmlFor={`reason-${attendanceId}-${credential.credentialTypeId}`}
            >
              Reason
            </Label>
            <Input
              autoComplete="off"
              id={`reason-${attendanceId}-${credential.credentialTypeId}`}
              name="reason"
              placeholder="Why is this being corrected?"
              required
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={pending}
          >
            {pending ? "Saving..." : `Save ${credential.code.toUpperCase()}`}
          </Button>
        </form>
      ))}
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="form-success" role="status">
          {state.success}
        </p>
      ) : null}
    </details>
  );
}
