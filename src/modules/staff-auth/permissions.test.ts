import { describe, expect, it } from "vitest";

import { hasPermission, PERMISSIONS } from "./permissions";

describe("staff permissions", () => {
  it("allows a permission that was granted", () => {
    expect(hasPermission(new Set([PERMISSIONS.STAFF_ACCESS]), PERMISSIONS.STAFF_ACCESS)).toBe(true);
  });

  it("denies a permission that was not granted", () => {
    expect(hasPermission(new Set(), PERMISSIONS.STAFF_ACCESS)).toBe(false);
  });
});
