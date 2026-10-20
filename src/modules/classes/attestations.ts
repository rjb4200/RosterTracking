import {
  type FireSignerCandidate,
  resolveFireSigner,
} from "@/modules/classes/fire-signer";

export const ATTESTATION_SCOPES = ["roster", "fire"] as const;
export type AttestationScope = (typeof ATTESTATION_SCOPES)[number];

export const ATTESTATION_SCOPE_LABELS: Record<AttestationScope, string> = {
  roster: "Roster",
  fire: "Fire roster",
};

export interface AttestationRecord {
  scope: AttestationScope;
  signedByUserId: string;
  signedByName: string;
  signedAt: Date;
  attestationVersion: string;
}

export interface RequiredAttestation {
  scope: AttestationScope;
  signerUserId: string;
}

/**
 * The scopes a class requires at finalization. The lead always signs the
 * roster; a Fire class also requires its resolved Fire signer.
 */
export function requiredAttestations<T extends FireSignerCandidate>(
  options: { reportsToFire: boolean },
  instructors: readonly T[],
): RequiredAttestation[] {
  const lead = instructors.find((instructor) => instructor.isLead);
  if (!lead) return [];
  const required: RequiredAttestation[] = [
    { scope: "roster", signerUserId: lead.userId },
  ];
  if (options.reportsToFire) {
    const fireSigner = resolveFireSigner(instructors);
    if (fireSigner) {
      required.push({ scope: "fire", signerUserId: fireSigner.userId });
    }
  }
  return required;
}

/** The signer recorded on a revision for a scope, or null when pending. */
export function signerForScope(
  attestations: readonly AttestationRecord[],
  scope: AttestationScope,
): string | null {
  return (
    attestations.find((attestation) => attestation.scope === scope)
      ?.signedByUserId ?? null
  );
}

export function hasAttestation(
  attestations: readonly AttestationRecord[],
  scope: AttestationScope,
): boolean {
  return attestations.some((attestation) => attestation.scope === scope);
}

/**
 * Maps a reporting destination to the scope that must be attested before it can
 * be marked entered. MTU has no signature requirement.
 */
export function reportingScope(systemCode: string): AttestationScope | null {
  if (systemCode === "fire") return "fire";
  if (systemCode === "kbems") return "roster";
  return null;
}
