import { describe, expect, it, vi } from "vitest";
import { encryptClassAccessPin } from "@/modules/classes/token";
import { encryptCredential } from "@/modules/reference/crypto";

const VALID_KEY = "WfAtPIckXdR1AkTmkBZOPGTns2gUyVLExMfK/1islVM=";
const PROBE = "roster-command-key-health-probe-v1";

/**
 * Builds a minimal in-memory stand-in for the two Drizzle reads the health
 * check performs, so the check can be exercised without a database.
 */
function fakeDb(options: { accessPinEncrypted: string | null }) {
  const rows = options.accessPinEncrypted
    ? [{ accessPinEncrypted: options.accessPinEncrypted }]
    : [];
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  } as unknown as Parameters<
    typeof import("./key-health").checkCredentialKeyHealth
  >[0];
}

async function loadHealth() {
  vi.resetModules();
  return import("./key-health");
}

describe("credential key health", () => {
  it("reports healthy when the key round-trips the probe", async () => {
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", VALID_KEY);
    const { checkCredentialKeyHealth } = await loadHealth();
    const report = await checkCredentialKeyHealth(
      fakeDb({ accessPinEncrypted: null }),
    );
    expect(report.probeOk).toBe(true);
    expect(report.healthy).toBe(true);
    vi.unstubAllEnvs();
  });

  it("detects a key that cannot decrypt data written with a different key", async () => {
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", VALID_KEY);
    const pinWrittenWithOldKey = encryptClassAccessPin("1234");

    // Swap in a different, still-valid key before the check runs.
    const differentKey = Buffer.from("different-key-material-32-bytes!!")
      .subarray(0, 32)
      .toString("base64");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", differentKey);

    const { checkCredentialKeyHealth } = await loadHealth();
    const report = await checkCredentialKeyHealth(
      fakeDb({ accessPinEncrypted: pinWrittenWithOldKey }),
    );
    expect(report.probeOk).toBe(true);
    expect(report.openClassPinOk).toBe(false);
    expect(report.healthy).toBe(false);
    expect(report.message).toMatch(/CREDENTIAL_ENCRYPTION_KEY/);
    vi.unstubAllEnvs();
  });

  it("fails the probe when the key is malformed", async () => {
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", "not-a-valid-key");
    const { checkCredentialKeyHealth } = await loadHealth();
    const report = await checkCredentialKeyHealth(
      fakeDb({ accessPinEncrypted: null }),
    );
    expect(report.probeOk).toBe(false);
    expect(report.healthy).toBe(false);
    vi.unstubAllEnvs();
  });

  it("is not affected by a valid probe alone", () => {
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", VALID_KEY);
    expect(encryptCredential(PROBE)).toBeTypeOf("string");
    vi.unstubAllEnvs();
  });
});
