"use client";

import { normalizeFfn } from "@/modules/reference/credential-format";

/**
 * A credential text input that tidies an FFN to its canonical `0000-0000` form
 * on blur. It only reformats when the value cleanly normalizes; anything else is
 * left as typed so the server can reject it with a message. The server
 * normalizes on submit regardless, so this is a convenience, not the guarantee.
 */
export function CredentialInput({
  id,
  name,
  defaultValue,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <input
      autoComplete="off"
      defaultValue={defaultValue ?? ""}
      id={id}
      name={name}
      onBlur={(event) => {
        const canonical = normalizeFfn(event.currentTarget.value);
        if (canonical) event.currentTarget.value = canonical;
      }}
      placeholder={placeholder}
      type="text"
    />
  );
}
