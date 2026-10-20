import { describe, expect, it } from "vitest";

import {
  type AttestationRecord,
  hasAttestation,
  reportingScope,
  requiredAttestations,
  signerForScope,
} from "./attestations";

const ffn = "1234-5678";

function lead(overrides: Record<string, unknown> = {}) {
  return {
    userId: "lead",
    isLead: true,
    ffn,
    level: 1,
    ...overrides,
  };
}

function assistant(overrides: Record<string, unknown> = {}) {
  return {
    userId: "assistant",
    isLead: false,
    ffn,
    level: 1,
    ...overrides,
  };
}

describe("required attestations", () => {
  it("requires only the roster for a KBEMS-only class", () => {
    expect(
      requiredAttestations({ reportsToFire: false }, [
        lead(),
        assistant({ ffn: null }),
      ]),
    ).toEqual([{ scope: "roster", signerUserId: "lead" }]);
  });

  it("requires the Fire signer for a Fire class", () => {
    expect(
      requiredAttestations({ reportsToFire: true }, [
        lead({ ffn: null }),
        assistant(),
      ]),
    ).toEqual([
      { scope: "roster", signerUserId: "lead" },
      { scope: "fire", signerUserId: "assistant" },
    ]);
  });

  it("requires both scopes for a Fire+KBEMS class", () => {
    expect(
      requiredAttestations({ reportsToFire: true }, [
        lead({ ffn: null }),
        assistant(),
      ]),
    ).toHaveLength(2);
  });

  it("uses one person for both scopes when the lead is fire-eligible", () => {
    expect(
      requiredAttestations({ reportsToFire: true }, [
        lead(),
        assistant({ ffn: null }),
      ]),
    ).toEqual([
      { scope: "roster", signerUserId: "lead" },
      { scope: "fire", signerUserId: "lead" },
    ]);
  });
});

describe("scope helpers", () => {
  const attestations: AttestationRecord[] = [
    {
      scope: "roster",
      signedByUserId: "lead",
      signedByName: "Lead Instructor",
      signedAt: new Date("2026-10-20T12:00:00.000Z"),
      attestationVersion: "roster-001",
    },
  ];

  it("returns the recorded signer for a scope", () => {
    expect(signerForScope(attestations, "roster")).toBe("lead");
    expect(signerForScope(attestations, "fire")).toBeNull();
  });

  it("reports whether a scope is attested", () => {
    expect(hasAttestation(attestations, "roster")).toBe(true);
    expect(hasAttestation(attestations, "fire")).toBe(false);
  });

  it("maps reporting destinations to their scope", () => {
    expect(reportingScope("fire")).toBe("fire");
    expect(reportingScope("kbems")).toBe("roster");
    expect(reportingScope("mtu")).toBeNull();
  });
});
