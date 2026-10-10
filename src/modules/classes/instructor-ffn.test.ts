import { describe, expect, it } from "vitest";

import { validateFireInstructorFfns } from "./instructor-ffn";

describe("Fire instructor FFN policy", () => {
  it("permits lead and assisting profiles with correctly formatted FFNs", () => {
    expect(() =>
      validateFireInstructorFfns([
        { displayName: "Lead", ffn: "1234-5678" },
        { displayName: "Assistant", ffn: "8765-4321" },
      ]),
    ).not.toThrow();
  });

  it("identifies every missing or malformed profile without disclosing FFNs", () => {
    expect(() =>
      validateFireInstructorFfns([
        { displayName: "Lead", ffn: null },
        { displayName: "Assistant", ffn: "12345678" },
      ]),
    ).toThrow(/Update the staff profile for: Lead, Assistant/);
    try {
      validateFireInstructorFfns([
        { displayName: "Assistant", ffn: "12345678" },
      ]);
    } catch (error) {
      expect((error as Error).message).not.toContain("12345678");
    }
  });
});
