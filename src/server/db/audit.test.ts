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
});
