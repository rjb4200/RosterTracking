import { describe, expect, it } from "vitest";

import { reduceRequirements } from "./requirements";

describe("reporting requirement resolution", () => {
  it("collects unique credential types and student fields", () => {
    const result = reduceRequirements([
      { kind: "credential", credentialCode: "ffn", studentField: null },
      { kind: "credential", credentialCode: "kemsis", studentField: null },
      { kind: "credential", credentialCode: "ffn", studentField: null },
      { kind: "student_field", credentialCode: null, studentField: "email" },
    ]);

    expect(result.credentialTypeCodes).toEqual(["ffn", "kemsis"]);
    expect(result.studentFields).toEqual(["email"]);
  });

  it("returns empty sets for no rows", () => {
    expect(reduceRequirements([])).toEqual({
      credentialTypeCodes: [],
      studentFields: [],
    });
  });
});
