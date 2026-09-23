import { describe, expect, it } from "vitest";

import { buildWizardSteps, orderedDestinationCodes } from "./destination-steps";

describe("class wizard destination steps", () => {
  it("shows only the shared steps when no destination is selected", () => {
    expect(buildWizardSteps([]).map((step) => step.key)).toEqual([
      "destinations",
      "class",
      "review",
    ]);
  });

  it("adds a step for each selected destination", () => {
    expect(buildWizardSteps(["fire"]).map((step) => step.key)).toEqual([
      "destinations",
      "fire",
      "class",
      "review",
    ]);
  });

  it("keeps destination order stable regardless of selection order", () => {
    expect(orderedDestinationCodes(["mtu", "fire"])).toEqual(["fire", "mtu"]);
    expect(buildWizardSteps(["mtu", "fire"]).map((step) => step.key)).toEqual([
      "destinations",
      "fire",
      "mtu",
      "class",
      "review",
    ]);
  });

  it("removes a step for a cleared destination", () => {
    const all = buildWizardSteps(["fire", "kbems", "mtu"]).map(
      (step) => step.key,
    );
    expect(all).toContain("kbems");
    const cleared = buildWizardSteps(["fire", "mtu"]).map((step) => step.key);
    expect(cleared).not.toContain("kbems");
  });

  it("labels destination steps", () => {
    expect(buildWizardSteps(["kbems"]).map((step) => step.label)).toEqual([
      "Destinations",
      "KBEMS",
      "Class & schedule",
      "Review",
    ]);
  });
});
