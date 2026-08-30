import { describe, expect, it } from "vitest";

import { isSessionCurrent } from "./policy";

const activeAccount = { id: "user-1", isActive: true, sessionVersion: 4 };

describe("staff session authorization", () => {
  it("accepts a matching active account", () => {
    expect(
      isSessionCurrent({ id: "user-1", sessionVersion: 4 }, activeAccount),
    ).toBe(true);
  });

  it("rejects a disabled account", () => {
    expect(
      isSessionCurrent(
        { id: "user-1", sessionVersion: 4 },
        { ...activeAccount, isActive: false },
      ),
    ).toBe(false);
  });

  it("rejects a stale session version", () => {
    expect(
      isSessionCurrent({ id: "user-1", sessionVersion: 3 }, activeAccount),
    ).toBe(false);
  });

  it("rejects a session for another account", () => {
    expect(
      isSessionCurrent({ id: "user-2", sessionVersion: 4 }, activeAccount),
    ).toBe(false);
  });
});
