import { CREDENTIAL_TYPE_CODES } from "./constants";

/** Canonical firefighter number, as entered on Fire Commission forms. */
export const FFN_VALUE_PATTERN = "^[0-9]{4}-[0-9]{4}$";
export const FFN_PATTERN = new RegExp(FFN_VALUE_PATTERN);

/** Message shown when a supplied FFN cannot be normalized to the canonical form. */
export const FFN_FORMAT_MESSAGE = "Enter the FFN as 8 digits, like 0000-0000.";

export function isValidFfn(value: string | null | undefined): boolean {
  return typeof value === "string" && FFN_PATTERN.test(value);
}

/** Optional per-type format; other credential types have no format restriction. */
export function credentialValuePattern(code: string): string | null {
  return code === CREDENTIAL_TYPE_CODES.FFN ? FFN_VALUE_PATTERN : null;
}

// Separators forgiven while reading an FFN: any whitespace, hyphen, en dash,
// em dash, minus sign, or period. Any other character is treated as a mistake
// so loose input is not silently accepted.
const FFN_ALLOWED_CHARACTER = /^[\d\s.\-\u2013\u2014\u2212]*$/;
const FFN_SEPARATOR = /[\s.\-\u2013\u2014\u2212]+/g;

/**
 * Canonicalizes a loose FFN to `dddd-dddd`. It accepts exactly eight digits
 * separated by forgiven characters, preserves leading zeros (it never parses a
 * number), and returns null for anything else — a stray letter or a wrong digit
 * count — so the caller rejects rather than guesses. A value already in the
 * canonical form passes through unchanged.
 */
export function normalizeFfn(value: string): string | null {
  const trimmed = value.trim();
  if (!FFN_ALLOWED_CHARACTER.test(trimmed)) return null;
  const digits = trimmed.replace(FFN_SEPARATOR, "");
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/**
 * Validates a supplied credential value and returns the value to store. An FFN
 * is normalized to its canonical form first, so an unambiguous 8-digit input is
 * accepted; the canonical value is what gets hashed for uniqueness, encrypted,
 * and masked.
 */
export function validateCredentialValue(
  value: string,
  type: { code: string; valuePattern?: string | null },
): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new Error("Enter a valid credential value.");
  }
  if (type.code === CREDENTIAL_TYPE_CODES.FFN) {
    const canonical = normalizeFfn(trimmed);
    if (!canonical) throw new Error(FFN_FORMAT_MESSAGE);
    return canonical;
  }
  const pattern = type.valuePattern ?? credentialValuePattern(type.code);
  if (pattern && !new RegExp(pattern).test(trimmed)) {
    throw new Error("Enter a valid credential value for this type.");
  }
  return trimmed;
}

/**
 * Whether an already-stored credential value is valid for its type, without any
 * normalization. Used where a stored value's validity is a fact — reporting
 * inclusion and the correction surface's invalid flag — so a non-canonical
 * stored value stays invalid rather than being reinterpreted.
 */
export function isValidCredentialValue(
  value: string | null | undefined,
  type: { code: string; valuePattern?: string | null },
): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200) return false;
  const pattern = type.valuePattern ?? credentialValuePattern(type.code);
  return !pattern || new RegExp(pattern).test(trimmed);
}
