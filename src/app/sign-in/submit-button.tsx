"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Working...",
  secondary = false,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  secondary?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`sign-in-button${secondary ? " sign-in-button-secondary" : ""}`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
