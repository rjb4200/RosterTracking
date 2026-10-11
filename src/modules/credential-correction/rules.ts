import "server-only";

import { CLASS_STATUSES } from "@/modules/classes/constants";
import { validateCredentialValue } from "@/modules/reference/credential-format";

/**
 * Credentials may be corrected only while a class is open. A finalized revision
 * is immutable by database rule, so a finalized class is corrected through the
 * Administrator reopen and re-finalize path instead.
 */
export function canCorrectCredentials(status: string): boolean {
  return status === CLASS_STATUSES.OPEN;
}

/**
 * Whether a stored value is valid for its credential type. An absent or
 * format-failing value is not valid, so it withholds reporting inclusion.
 */
export function promptedCredentialIsValid(
  type: { code: string; valuePattern?: string | null },
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  try {
    validateCredentialValue(value, type);
    return true;
  } catch {
    return false;
  }
}
