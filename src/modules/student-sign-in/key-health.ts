import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";
import { decryptClassAccessPin } from "@/modules/classes/token";
import {
  decryptCredential,
  encryptCredential,
} from "@/modules/reference/crypto";
import type { Database } from "@/server/db/client";
import { trainingClasses } from "@/server/db/schema";

/**
 * Deterministic probe plaintext. The check encrypts and immediately decrypts
 * this value, so it is repeatable across instances and reveals nothing.
 */
export const KEY_HEALTH_PROBE = "roster-command-key-health-probe-v1";

export interface KeyHealthReport {
  healthy: boolean;
  probeOk: boolean;
  openClassPinOk: boolean | null;
  message: string;
}

/**
 * Verifies the configured credential key can round-trip a known value and, when
 * an open class has a PIN, that the stored PIN is still decryptable. A failure
 * here means stored credentials and PINs cannot be read and the cause is the
 * credential key, not the data.
 */
export async function checkCredentialKeyHealth(
  db: Database,
): Promise<KeyHealthReport> {
  let probeOk = false;
  try {
    probeOk =
      decryptCredential(encryptCredential(KEY_HEALTH_PROBE)) ===
      KEY_HEALTH_PROBE;
  } catch {
    probeOk = false;
  }

  let openClassPinOk: boolean | null = null;
  try {
    const [openClass] = await db
      .select({ accessPinEncrypted: trainingClasses.accessPinEncrypted })
      .from(trainingClasses)
      .where(
        and(
          eq(trainingClasses.accessPinEnabled, true),
          isNotNull(trainingClasses.accessPinEncrypted),
        ),
      )
      .limit(1);
    if (openClass?.accessPinEncrypted) {
      openClassPinOk =
        decryptClassAccessPin(openClass.accessPinEncrypted) !== null;
    }
  } catch {
    openClassPinOk = false;
  }

  const healthy = probeOk && openClassPinOk !== false;
  return {
    healthy,
    probeOk,
    openClassPinOk,
    message: healthy
      ? "Credential key is healthy."
      : "Stored credentials and PINs cannot be read. Verify CREDENTIAL_ENCRYPTION_KEY matches the key used when the data was written.",
  };
}

/**
 * Logs a single warning at startup when the credential key is unusable, so a
 * configuration fault is visible before students encounter it.
 */
export async function warnOnUnhealthyCredentialKey(
  db: Database,
): Promise<void> {
  const report = await checkCredentialKeyHealth(db);
  if (!report.healthy) {
    console.error(
      JSON.stringify({
        scope: "credential-key-health",
        healthy: false,
        probeOk: report.probeOk,
        openClassPinOk: report.openClassPinOk,
        message: report.message,
      }),
    );
  }
}
