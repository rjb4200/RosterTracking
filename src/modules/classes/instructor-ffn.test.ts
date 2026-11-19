import { describe, expect, it } from "vitest";

import { validateFireInstructors } from "./instructor-ffn";

describe("Fire instructor policy", () => {
  it("permits a Fire class whose lead is fire-qualified", () => {
    expect(() =>
      validateFireInstructors([
        {
          displayName: "Lead",
          ffn: "1234-5678",
          instructorLevel: 2,
        },
        {
          displayName: "Assistant",
          ffn: null,
          instructorLevel: null,
        },
      ]),
    ).not.toThrow();
  });

  it("requires both a valid FFN and a Fire Instructor level", () => {
    expect(() =>
      validateFireInstructors([
        {
          displayName: "FFN only",
          ffn: "1234-5678",
          instructorLevel: null,
        },
        {
          displayName: "Level only",
          ffn: null,
          instructorLevel: 2,
        },
      ]),
    ).toThrow(/valid FFN.*Fire Instructor level/);
  });

  it("identifies the lead without disclosing the FFN", () => {
    try {
      validateFireInstructors([
        {
          displayName: "Lead",
          ffn: "12345678",
          instructorLevel: 2,
        },
        {
          displayName: "Assistant",
          ffn: null,
          instructorLevel: null,
        },
      ]);
    } catch (error) {
      expect((error as Error).message).toContain("Lead");
      expect((error as Error).message).not.toContain("12345678");
    }
  });

  it("requires a lead instructor", () => {
    expect(() => validateFireInstructors([])).toThrow(
      /Assign a fire-qualified lead instructor/,
    );
  });
});
