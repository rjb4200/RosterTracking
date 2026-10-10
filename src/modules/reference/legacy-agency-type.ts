import { AGENCY_TAG_CODES } from "./constants";

export interface LegacyTagOption {
  id: string;
  code: string;
  name: string;
}

export interface LegacyTagResolution {
  code: string;
  matched: boolean;
}

/**
 * Resolves a legacy free-text agency type to a tag. A case-insensitive,
 * trimmed match on a tag name wins; any non-empty value with no match falls
 * back to the Other tag. An empty value resolves to null (no tag).
 */
export function resolveLegacyAgencyTag(
  legacyType: string | null | undefined,
  tags: readonly Pick<LegacyTagOption, "code" | "name">[],
): LegacyTagResolution | null {
  const value = (legacyType ?? "").trim().toLowerCase();
  if (!value) return null;
  const match = tags.find((tag) => tag.name.trim().toLowerCase() === value);
  if (match) return { code: match.code, matched: true };
  const hasOther = tags.some((tag) => tag.code === AGENCY_TAG_CODES.OTHER);
  return hasOther ? { code: AGENCY_TAG_CODES.OTHER, matched: false } : null;
}
