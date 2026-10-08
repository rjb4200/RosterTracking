import { describe, expect, it } from "vitest";

import { getOperationalClassAction, isOverdueRoster } from "./services";

describe("operational class dashboard state", () => {
  it("maps class lifecycle states to their dashboard actions", () => {
    expect(getOperationalClassAction("open")).toBe("roster");
    expect(getOperationalClassAction("finalized")).toBe("view");
  });

  it("marks only open rosters overdue after 24 hours", () => {
    const endedAt = new Date("2026-09-10T12:00:00Z");
    expect(
      isOverdueRoster("open", endedAt, new Date("2026-09-11T12:00:00Z")),
    ).toBe(false);
    expect(
      isOverdueRoster("open", endedAt, new Date("2026-09-11T12:00:01Z")),
    ).toBe(true);
    expect(
      isOverdueRoster("finalized", endedAt, new Date("2026-09-12T12:00:00Z")),
    ).toBe(false);
    expect(
      isOverdueRoster("open", null, new Date("2026-09-12T12:00:00Z")),
    ).toBe(false);
  });
});
