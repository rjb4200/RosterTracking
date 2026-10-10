import { describe, expect, it } from "vitest";

import {
  promptCredentialCodes,
  reduceClassRequirements,
  requiredRegistrationFields,
} from "./requirements";

describe("class reporting requirement resolution", () => {
  it("retains each set version and computes a deduplicated union", () => {
    const resolved = reduceClassRequirements([
      {
        requirementSetId: "set-fire",
        version: 2,
        reportingSystemId: "system-fire",
        reportingSystemCode: "fire",
        kind: "credential",
        studentField: null,
        credentialTypeId: "credential-ffn",
        credentialCode: "ffn",
      },
      {
        requirementSetId: "set-kbems",
        version: 4,
        reportingSystemId: "system-kbems",
        reportingSystemCode: "kbems",
        kind: "credential",
        studentField: null,
        credentialTypeId: "credential-ffn",
        credentialCode: "ffn",
      },
      {
        requirementSetId: "set-kbems",
        version: 4,
        reportingSystemId: "system-kbems",
        reportingSystemCode: "kbems",
        kind: "student_field",
        studentField: "email",
        credentialTypeId: null,
        credentialCode: null,
      },
    ]);

    expect(resolved.sets).toEqual([
      expect.objectContaining({ id: "set-fire", version: 2 }),
      expect.objectContaining({ id: "set-kbems", version: 4 }),
    ]);
    expect(resolved.credentials).toEqual([
      { id: "credential-ffn", code: "ffn" },
    ]);
    expect(resolved.studentFields).toEqual(["email"]);
  });

  it("requires an email for certificate delivery, not reporting-specific fields", () => {
    expect(
      requiredRegistrationFields({
        sets: [],
        studentFields: [],
        credentials: [],
      }),
    ).toEqual(["email"]);
    expect(
      requiredRegistrationFields({
        sets: [],
        studentFields: ["studentNumber"],
        credentials: [],
      }),
    ).toEqual(["email"]);
    expect(
      requiredRegistrationFields({
        sets: [],
        studentFields: ["email", "studentNumber"],
        credentials: [],
      }),
    ).toEqual(["email"]);
  });

  it("offers FFN for Fire and KEMSIS/NREMT for KBEMS without prompting FEMA", () => {
    expect(promptCredentialCodes(["fire"])).toEqual(["ffn"]);
    expect(promptCredentialCodes(["kbems"])).toEqual(["kemsis", "nremt"]);
    expect(promptCredentialCodes(["fire", "kbems", "mtu"])).toEqual([
      "ffn",
      "kemsis",
      "nremt",
    ]);
    expect(promptCredentialCodes(["mtu", "fema"])).toEqual([]);
  });
});
