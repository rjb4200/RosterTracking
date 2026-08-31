import { describe, expect, it } from "vitest";

import { shouldClearExistingPrimary } from "./services";

describe("student agency primary membership", () => {
  it("clears an existing primary when assigning a new active primary", () => {
    expect(
      shouldClearExistingPrimary({ isPrimary: true, isActive: true }),
    ).toBe(true);
  });

  it("keeps the existing primary when adding an inactive membership", () => {
    expect(
      shouldClearExistingPrimary({ isPrimary: true, isActive: false }),
    ).toBe(false);
  });
});
