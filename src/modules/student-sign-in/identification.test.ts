import { describe, expect, it } from "vitest";

import {
  clearParticipantForNotMe,
  confirmRecognizedStudent,
  RECOVERY_CREDENTIAL_TYPES,
  stagePendingRecognizedStudent,
} from "./identification";
import { emptySignInWorkflowState } from "./types";

const studentId = "00000000-0000-4000-8000-000000000001";

describe("student recovery policy", () => {
  it("keeps a recognized profile unconfirmed until the visitor accepts it", () => {
    const state = stagePendingRecognizedStudent(emptySignInWorkflowState(), {
      status: "identified",
      method: "remembered_device",
      rememberedDeviceId: "00000000-0000-4000-8000-000000000003",
      student: { id: studentId, firstName: "Ada", lastName: "Lovelace" },
    });

    expect(state.participant).toMatchObject({
      kind: "regular",
      studentId,
      profileConfirmed: false,
      signInMethod: "remembered_device",
    });
  });

  it("always presents both supported recovery credential choices", () => {
    expect(RECOVERY_CREDENTIAL_TYPES).toEqual(["ffn", "kemsis"]);
  });

  it("requires affirmative confirmation to stage a recovered phone", () => {
    const state = confirmRecognizedStudent(emptySignInWorkflowState(), {
      status: "identified",
      method: "recovery",
      replacementPhone: "+18595551234",
      student: { id: studentId, firstName: "Ada", lastName: "Lovelace" },
    });
    expect(state.participant).toMatchObject({
      kind: "regular",
      studentId,
      signInMethod: "recovery",
      profileConfirmed: true,
      replacementPhone: "+18595551234",
    });
  });

  it("clears identity, recovery phone, and agency on Not me", () => {
    const identified = confirmRecognizedStudent(emptySignInWorkflowState(), {
      status: "identified",
      method: "recovery",
      replacementPhone: "+18595551234",
      student: { id: studentId, firstName: "Ada", lastName: "Lovelace" },
    });
    const cleared = clearParticipantForNotMe({
      ...identified,
      selectedAgencyId: "00000000-0000-4000-8000-000000000002",
    });
    expect(cleared.participant).toBeNull();
    expect(cleared.selectedAgencyId).toBeNull();
  });
});
