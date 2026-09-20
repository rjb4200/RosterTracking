import type { DatabaseTransaction } from "./client";
import type { NewAuditLog } from "./schema";
import { auditLogs } from "./schema";

const forbiddenDetailKeys = new Set([
  "password",
  "passwordHash",
  "pin",
  "token",
  "secret",
  "credentialValue",
  "phone",
  "phoneNumber",
  "originatingIp",
  "rememberedToken",
]);

/**
 * Blocks values that must never be persisted to an audit row even under an
 * otherwise-safe key: normalized `+1` phone numbers and bare 10-digit US phone
 * numbers. Key-name filtering above handles named sensitive fields; this catches
 * a phone number that slipped in as an unnamed or renamed value.
 */
function isPhoneLikeValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return /^\+1\d{10}$/.test(trimmed) || /^\d{10}$/.test(trimmed);
}

export function sanitizeAuditDetails(
  details: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(details).filter(
      ([key, value]) =>
        !forbiddenDetailKeys.has(key) && !isPhoneLikeValue(value),
    ),
  );
}

export async function writeAuditLog(
  transaction: DatabaseTransaction,
  event: Omit<NewAuditLog, "id" | "occurredAt" | "details"> & {
    details?: Record<string, unknown>;
  },
): Promise<void> {
  await transaction.insert(auditLogs).values({
    ...event,
    details: sanitizeAuditDetails(event.details ?? {}),
  });
}
