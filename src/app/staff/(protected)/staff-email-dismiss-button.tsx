"use client";

import { X } from "lucide-react";

import {
  EMAIL_PROMPT_COOKIE,
  EMAIL_PROMPT_MAX_AGE_SECONDS,
} from "@/modules/staff-auth/email-prompt";

/**
 * Records that the prompt was dismissed for the current login and reloads so
 * the server-rendered layout omits the band for the rest of the sign-in.
 */
export function StaffEmailDismissButton({
  loginMarker,
}: {
  loginMarker: string;
}) {
  return (
    <button
      aria-label="Dismiss"
      className="staff-email-band-dismiss"
      onClick={() => {
        document.cookie = `${EMAIL_PROMPT_COOKIE}=${loginMarker}; path=/; max-age=${EMAIL_PROMPT_MAX_AGE_SECONDS}; samesite=lax`;
        window.location.reload();
      }}
      type="button"
    >
      <X aria-hidden="true" />
    </button>
  );
}
