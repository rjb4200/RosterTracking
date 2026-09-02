import { describe, expect, it } from "vitest";

import { emptySignInWorkflowState, signInWorkflowStateSchema } from "./types";

describe("sign-in workflow state", () => {
  it("creates a typed empty state", () => {
    expect(emptySignInWorkflowState()).toEqual({
      participant: null,
      selectedAgencyId: null,
      pendingNewPhone: null,
      requirementSets: [],
    });
  });

  it("rejects unrecognized decrypted state instead of casting it", () => {
    expect(
      signInWorkflowStateSchema.safeParse({ participant: { kind: "admin" } })
        .success,
    ).toBe(false);
  });
});
