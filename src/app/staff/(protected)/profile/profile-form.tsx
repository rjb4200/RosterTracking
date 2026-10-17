"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeFfn } from "@/modules/reference/credential-format";
import {
  INSTRUCTOR_LEVELS,
  type ProfileActionState,
  type ProfileValues,
} from "@/modules/staff-auth/profile-contract";

export function ProfileForm({
  action,
  values,
  userId,
  idPrefix,
  heading,
}: {
  action: (
    prev: ProfileActionState | undefined,
    formData: FormData,
  ) => Promise<ProfileActionState>;
  values?: ProfileValues | null;
  userId?: string;
  idPrefix: string;
  heading?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [email, setEmail] = useState(values?.email ?? "");
  const [ffn, setFfn] = useState(values?.ffn ?? "");
  const [instructorLevel, setInstructorLevel] = useState(
    values?.instructorLevel != null ? String(values.instructorLevel) : "",
  );
  const [emsProviderNumber, setEmsProviderNumber] = useState(
    values?.emsProviderNumber ?? "",
  );

  return (
    <form action={formAction} className="stack-form">
      {heading ? <h2>{heading}</h2> : null}
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      <div className="field">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="field">
        <Label htmlFor={`${idPrefix}-ffn`}>Firefighter number (FFN)</Label>
        <Input
          id={`${idPrefix}-ffn`}
          name="ffn"
          onBlur={(event) => {
            const canonical = normalizeFfn(event.currentTarget.value);
            if (canonical) setFfn(canonical);
          }}
          onChange={(event) => setFfn(event.target.value)}
          placeholder="e.g. 1234-5678"
          value={ffn}
        />
      </div>
      <div className="field">
        <Label htmlFor={`${idPrefix}-level`}>Fire Instructor level</Label>
        <select
          id={`${idPrefix}-level`}
          className="select-input"
          name="instructorLevel"
          value={instructorLevel}
          onChange={(event) => setInstructorLevel(event.target.value)}
        >
          <option value="">Not recorded</option>
          {INSTRUCTOR_LEVELS.map((level) => (
            <option key={level} value={level}>
              Level {level}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <Label htmlFor={`${idPrefix}-ems`}>State EMS provider number</Label>
        <Input
          id={`${idPrefix}-ems`}
          name="emsProviderNumber"
          value={emsProviderNumber}
          onChange={(event) => setEmsProviderNumber(event.target.value)}
        />
      </div>
      <p
        className={state?.error ? "form-error" : "form-success"}
        aria-live="polite"
      >
        {state?.error ?? state?.success}
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
