import { describe, expect, it } from "vitest";

import { computeRosterRefreshDeadline } from "./refresh";

describe("roster refresh deadline", () => {
  it("adds the grace period to the latest of several session ends", () => {
    const deadline = computeRosterRefreshDeadline([
      new Date("2026-09-10T17:00:00Z"),
      new Date("2026-09-10T20:00:00Z"),
      new Date("2026-09-09T12:00:00Z"),
    ]);
    expect(deadline?.toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });

  it("returns no deadline when the class has no sessions", () => {
    expect(computeRosterRefreshDeadline([])).toBeNull();
  });

  it("honors a custom grace period", () => {
    const deadline = computeRosterRefreshDeadline(
      [new Date("2026-09-10T17:00:00Z")],
      1,
    );
    expect(deadline?.toISOString()).toBe("2026-09-10T18:00:00.000Z");
  });
});
