import "server-only";

import { CLASS_STATUSES } from "@/modules/classes/constants";
import { isValidCredentialValue } from "@/modules/reference/credential-format";

/**
 * Credentials may be corrected only while a class is open. A finalized revision
 * is immutable by database rule, so a finalized class is corrected through the
 * Administrator reopen and re-finalize path instead.
 */
export function canCorrectCredentials(status: string): boolean {
  return status === CLASS_STATUSES.OPEN;
}

/**
 * Whether a stored value is valid for its credential type. A stored value's
 * validity is a fact and is not normalized, so an absent or non-canonical value
 * reads as invalid and prompts the operator to correct it.
 */
export function promptedCredentialIsValid(
  type: { code: string; valuePattern?: string | null },
  value: string | null | undefined,
): boolean {
  return isValidCredentialValue(value, type);
}
