import type { NewAuditLog } from "./schema";

import type { DatabaseTransaction } from "./client";
import { auditLogs } from "./schema";

const forbiddenDetailKeys = new Set([
  "password",
  "passwordHash",
  "pin",
  "token",
  "secret",
  "credentialValue",
]);

export function sanitizeAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(details).filter(([key]) => !forbiddenDetailKeys.has(key)));
}

export async function writeAuditLog(
  transaction: DatabaseTransaction,
  event: Omit<NewAuditLog, "id" | "occurredAt" | "details"> & { details?: Record<string, unknown> },
): Promise<void> {
  await transaction.insert(auditLogs).values({
    ...event,
    details: sanitizeAuditDetails(event.details ?? {}),
  });
}
