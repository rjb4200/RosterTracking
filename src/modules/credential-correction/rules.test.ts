import { describe, expect, it } from "vitest";

import { canCorrectCredentials, promptedCredentialIsValid } from "./rules";

describe("credential correction rules", () => {
  it("allows correction only while a class is open", () => {
    expect(canCorrectCredentials("open")).toBe(true);
    expect(canCorrectCredentials("finalized")).toBe(false);
    expect(canCorrectCredentials("cancelled")).toBe(false);
  });

  it("validates a value against the credential type format", () => {
    expect(promptedCredentialIsValid({ code: "ffn" }, "1234-5678")).toBe(true);
    expect(promptedCredentialIsValid({ code: "ffn" }, "1234")).toBe(false);
    expect(promptedCredentialIsValid({ code: "ffn" }, "")).toBe(false);
    expect(promptedCredentialIsValid({ code: "ffn" }, null)).toBe(false);
    // A type without a format accepts any non-empty value.
    expect(promptedCredentialIsValid({ code: "kemsis" }, "ABC-123")).toBe(true);
  });
});
