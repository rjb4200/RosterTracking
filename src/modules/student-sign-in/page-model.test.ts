import { describe, expect, it } from "vitest";

import { confirmationDestination, requestedEntryStep } from "./page-model";

describe("public sign-in view logic", () => {
  it("allows only known entry screens", () => {
    expect(requestedEntryStep("recovery")).toBe("recovery");
    expect(requestedEntryStep("guest")).toBe("guest");
    expect(requestedEntryStep("register")).toBe("register");
    expect(requestedEntryStep("review")).toBe("phone");
  });

  it("uses a duplicate-safe success destination", () => {
    expect(confirmationDestination("created")).toContain("status=success");
    expect(confirmationDestination("idempotent")).toContain(
      "status=already-signed-in",
    );
    expect(confirmationDestination("already_signed_in")).toContain(
      "status=already-signed-in",
    );
  });
});
