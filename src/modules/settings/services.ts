import { eq } from "drizzle-orm";

import { isAdministrator } from "@/modules/staff-auth/workspaces";
import type { Database } from "@/server/db/client";
import { appSettings } from "@/server/db/schema";

/** The default initial-certification TEI number used when none is configured. */
export const DEFAULT_INITIAL_CERT_TEI = "126";

/** The settings key holding the initial-certification TEI number. */
export const INITIAL_CERT_TEI_KEY = "initial_cert.tei";

/**
 * The configured initial-certification TEI number, or the default when no
 * administrator has set one.
 */
export async function getInitialCertTei(db: Database): Promise<string> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, INITIAL_CERT_TEI_KEY))
    .limit(1);
  const value = row?.value.trim();
  return value ? value : DEFAULT_INITIAL_CERT_TEI;
}

/**
 * Set the initial-certification TEI number. Refuses unless the actor is an
 * administrator, and requires a three-digit value. Returns the stored value.
 */
export async function setInitialCertTei(
  db: Database,
  roleCodes: ReadonlySet<string>,
  value: string,
): Promise<string> {
  if (!isAdministrator(roleCodes)) {
    throw new Error("Only administrators can change the TEI number.");
  }
  const normalized = value.trim();
  if (!/^\d{3}$/.test(normalized)) {
    throw new Error("Enter the TEI number as three digits.");
  }
  await db
    .insert(appSettings)
    .values({ key: INITIAL_CERT_TEI_KEY, value: normalized })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: normalized },
    });
  return normalized;
}
