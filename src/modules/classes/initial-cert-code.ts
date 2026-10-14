/**
 * Helpers for KBEMS initial-certification course numbers. The number shape is
 * `<TEI>-<YY>-<CC>-<T>`: a three-digit TEI, a two-digit year, a two-digit Class
 * ID, and a Type letter of R, B, A, or P. Values are matched case-insensitively
 * and stored uppercase.
 */

const TYPE_LETTERS = "RBAP";

/** How many recently used initial-certification numbers are offered. */
export const RECENT_INITIAL_CERT_NUMBER_LIMIT = 5;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Trim and uppercase an initial-certification course number for storage. */
export function normalizeInitialCertNumber(value: string): string {
  return value.trim().toUpperCase();
}

/** Whether the value matches `<TEI>-<YY>-<CC>-<T>` for the configured TEI. */
export function isInitialCertNumberValid(value: string, tei: string): boolean {
  const normalizedTei = tei.trim();
  if (!/^\d{3}$/.test(normalizedTei)) {
    return false;
  }
  const pattern = new RegExp(
    `^${escapeRegExp(normalizedTei)}-\\d{2}-\\d{2}-[${TYPE_LETTERS}]$`,
  );
  return pattern.test(normalizeInitialCertNumber(value));
}

/**
 * The distinct non-empty course numbers from the most recently updated classes,
 * most recent first, capped at the given limit. Rows must already be ordered by
 * recency.
 */
export function deriveRecentInitialCertNumbers(
  rows: ReadonlyArray<{ courseNumber: string | null }>,
  limit: number = RECENT_INITIAL_CERT_NUMBER_LIMIT,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of rows) {
    const value = row.courseNumber?.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}
