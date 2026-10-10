import { describe, expect, it } from "vitest";

import {
  type InclusionRule,
  includesParticipant,
  needsFireCreditWarning,
} from "./inclusion";

function rule(mode: InclusionRule["mode"]): InclusionRule {
  return {
    reportingSystemCode: "fire",
    requirementSetId: "version-2",
    version: 2,
    mode,
    credentialCode: mode === "credential" ? "ffn" : null,
    credentialPattern: mode === "credential" ? "^[0-9]{4}-[0-9]{4}$" : null,
  };
}

describe("destination inclusion", () => {
  it("includes only people with a correctly formatted FFN on the Fire roster", () => {
    expect(includesParticipant(rule("credential"), { ffn: "1234-5678" })).toBe(
      true,
    );
    expect(includesParticipant(rule("credential"), { ffn: "12345678" })).toBe(
      false,
    );
    expect(includesParticipant(rule("credential"), { kemsis: "123" })).toBe(
      false,
    );
  });

  it("includes everyone for EMS and no participants for resource-only MTU", () => {
    expect(includesParticipant(rule("all"), {})).toBe(true);
    expect(includesParticipant(rule("none"), { ffn: "1234-5678" })).toBe(false);
  });

  it("warns on a Fire class only when Fire credit will be withheld", () => {
    const fire = rule("credential");
    expect(needsFireCreditWarning(fire, "1234-5678")).toBe(false);
    expect(needsFireCreditWarning(fire, "12345678")).toBe(true);
    expect(needsFireCreditWarning(fire, null)).toBe(true);
    // Non-Fire destinations never show the Fire-credit warning.
    expect(needsFireCreditWarning(rule("all"), null)).toBe(false);
    expect(needsFireCreditWarning(undefined, null)).toBe(false);
  });
});
