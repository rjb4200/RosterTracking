import { describe, expect, it } from "vitest";

import { sanitizeAuditDetails } from "./audit";

describe("audit detail sanitization", () => {
  it("removes credential material while retaining safe context", () => {
    expect(
      sanitizeAuditDetails({
        username: "chief",
        password: "not-safe",
        passwordHash: "not-safe",
        token: "not-safe",
        reason: "operator reset",
      }),
    ).toEqual({ username: "chief", reason: "operator reset" });
  });

  it("drops phone-like values even under an unnamed key", () => {
    expect(
      sanitizeAuditDetails({
        contact: "+18595551234",
        alternate: "8595551234",
        note: "called the station",
      }),
    ).toEqual({ note: "called the station" });
  });

  it("removes named contact and device fields", () => {
    expect(
      sanitizeAuditDetails({
        phone: "+18595551234",
        phoneNumber: "8595551234",
        originatingIp: "203.0.113.10",
        rememberedToken: "abc",
        agencyId: "7cebafbb-bdaf-4ca5-9aa6-5f5a348ae2de",
      }),
    ).toEqual({ agencyId: "7cebafbb-bdaf-4ca5-9aa6-5f5a348ae2de" });
  });

  it("retains safe masked credential suffixes", () => {
    expect(
      sanitizeAuditDetails({ credentialTypeId: "abc", maskedSuffix: "1234" }),
    ).toEqual({ credentialTypeId: "abc", maskedSuffix: "1234" });
  });
});
