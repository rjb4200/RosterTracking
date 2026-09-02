"use client";

import Image from "next/image";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import type { ActionState } from "./actions";

export function TokenPanel({
  classId,
  action,
}: {
  classId: string;
  action: (
    prev: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="stack-form">
      <input type="hidden" name="classId" value={classId} />
      <p>
        Previously generated raw links cannot be retrieved. Rotate access to
        create a new one.
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.signInUrl && state.qrDataUrl ? (
        <div className="token-panel" aria-live="polite">
          <a href={state.signInUrl}>{state.signInUrl}</a>
          <Image
            src={state.qrDataUrl}
            alt="Class sign-in QR code"
            width={240}
            height={240}
            unoptimized
          />
        </div>
      ) : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Rotating..." : "Rotate sign-in access"}
      </Button>
    </form>
  );
}
