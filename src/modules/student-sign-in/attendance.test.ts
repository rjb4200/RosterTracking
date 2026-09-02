import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  attendancePayloadFingerprint,
  renderAttendanceAttestation,
} from "./attendance";
import type { SignInWorkflowState } from "./types";

const classId = "00000000-0000-4000-8000-000000000001";
const studentId = "00000000-0000-4000-8000-000000000002";
const agencyId = "00000000-0000-4000-8000-000000000003";
const credentialTypeId = "00000000-0000-4000-8000-000000000004";
const requirementSetId = "00000000-0000-4000-8000-000000000005";

function state(): SignInWorkflowState {
  return {
    participant: {
      kind: "regular",
      studentId,
      signInMethod: "recovery",
      profileConfirmed: true,
      replacementPhone: "+18595551234",
      fields: { email: "student@example.com" },
      credentials: [{ credentialTypeId, code: "ffn", value: "FF-123456" }],
    },
    selectedAgencyId: agencyId,
    pendingNewPhone: null,
    requirementSets: [{ id: requirementSetId, version: 3 }],
  };
}

function fingerprint(workflowState = state()) {
  return attendancePayloadFingerprint({
    classId,
    tokenVersion: 2,
    idempotencyKey: "server-idempotency-key",
    state: workflowState,
    attestationConfirmed: true,
    rememberDevice: true,
  });
}

describe("attendance attestation", () => {
  beforeAll(() => {
    vi.stubEnv(
      "AUTH_SECRET",
      "a-secret-that-is-at-least-thirty-two-characters",
    );
  });

  it("renders and normalizes the approved named text", () => {
    expect(renderAttendanceAttestation(" Ada   Lovelace ")).toBe(
      "I confirm that I am Ada Lovelace and attended this class.",
    );
  });

  it("produces a stable fingerprint independent of object key order", () => {
    const reordered = state();
    if (!reordered.participant)
      throw new Error("Test participant is required.");
    reordered.participant = {
      ...reordered.participant,
      fields: { email: "student@example.com" },
    } as SignInWorkflowState["participant"];
    expect(fingerprint(reordered)).toBe(fingerprint());
  });

  it.each([
    [
      "profile confirmation",
      (value: SignInWorkflowState) => {
        if (value.participant?.kind === "regular")
          value.participant.profileConfirmed = false;
      },
    ],
    [
      "replacement phone",
      (value: SignInWorkflowState) => {
        if (value.participant?.kind === "regular")
          value.participant.replacementPhone = "+18595559876";
      },
    ],
    [
      "required field",
      (value: SignInWorkflowState) => {
        if (value.participant)
          value.participant.fields.email = "changed@example.com";
      },
    ],
    [
      "credential",
      (value: SignInWorkflowState) => {
        const credential = value.participant?.credentials[0];
        if (credential) credential.value = "FF-654321";
      },
    ],
    [
      "agency",
      (value: SignInWorkflowState) => {
        value.selectedAgencyId = "00000000-0000-4000-8000-000000000006";
      },
    ],
    [
      "requirement version",
      (value: SignInWorkflowState) => {
        const requirementSet = value.requirementSets[0];
        if (requirementSet) requirementSet.version = 4;
      },
    ],
  ])("changes when %s changes", (_label, mutate) => {
    const changed = structuredClone(state());
    mutate(changed);
    expect(fingerprint(changed)).not.toBe(fingerprint());
  });

  it("binds remembered-device issuance and attestation acceptance", () => {
    const common = {
      classId,
      tokenVersion: 2,
      idempotencyKey: "server-idempotency-key",
      state: state(),
    };
    expect(
      attendancePayloadFingerprint({
        ...common,
        attestationConfirmed: true,
        rememberDevice: true,
      }),
    ).not.toBe(
      attendancePayloadFingerprint({
        ...common,
        attestationConfirmed: true,
        rememberDevice: false,
      }),
    );
  });
});
