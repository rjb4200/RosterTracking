export const EMAIL_PROMPT_COOKIE = "staffEmailPromptDismissed";
export const EMAIL_PROMPT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Whether the missing-email prompt should render. The prompt stays hidden once
 * an email is stored, and a dismissal applies only to the current login: it is
 * remembered against the login marker and clears when a later login changes it.
 */
export function shouldShowEmailPrompt(
  email: string | null | undefined,
  loginMarker: string,
  dismissedMarker: string | null | undefined,
): boolean {
  const missing = !email || email.trim() === "";
  if (!missing) return false;
  if (!loginMarker) return true;
  return dismissedMarker !== loginMarker;
}
