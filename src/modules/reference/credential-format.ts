import { CREDENTIAL_TYPE_CODES } from "./constants";

/** Canonical firefighter number, as entered on Fire Commission forms. */
export const FFN_VALUE_PATTERN = "^[0-9]{4}-[0-9]{4}$";
export const FFN_PATTERN = new RegExp(FFN_VALUE_PATTERN);

export function isValidFfn(value: string | null | undefined): boolean {
  return typeof value === "string" && FFN_PATTERN.test(value);
}

/** Optional per-type format; other credential types have no format restriction. */
export function credentialValuePattern(code: string): string | null {
  return code === CREDENTIAL_TYPE_CODES.FFN ? FFN_VALUE_PATTERN : null;
}

export function validateCredentialValue(
  value: string,
  type: { code: string; valuePattern?: string | null },
): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) {
    throw new Error("Enter a valid credential value.");
  }
  const pattern = type.valuePattern ?? credentialValuePattern(type.code);
  if (pattern && !new RegExp(pattern).test(normalized)) {
    if (type.code === CREDENTIAL_TYPE_CODES.FFN) {
      throw new Error("FFN must be in the format 0000-0000.");
    }
    throw new Error("Enter a valid credential value for this type.");
  }
  return normalized;
}
