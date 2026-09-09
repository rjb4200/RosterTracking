import { describe, expect, it } from "vitest";

import { ROLE_CODES } from "./permissions";
import { resolveStaffWorkspace, workspaceHref } from "./workspaces";

describe("staff workspaces", () => {
  it("routes an Instructor to the Instructor workspace", () => {
    expect(resolveStaffWorkspace(new Set([ROLE_CODES.INSTRUCTOR]))).toBe(
      "instructor",
    );
  });

  it("routes elevated roles to the Admin workspace", () => {
    expect(resolveStaffWorkspace(new Set([ROLE_CODES.TRAINING_MAJOR]))).toBe(
      "admin",
    );
    expect(resolveStaffWorkspace(new Set([ROLE_CODES.ADMINISTRATOR]))).toBe(
      "admin",
    );
  });

  it("preserves elevated precedence for legacy multi-role accounts", () => {
    expect(
      resolveStaffWorkspace(
        new Set([ROLE_CODES.INSTRUCTOR, ROLE_CODES.ADMINISTRATOR]),
      ),
    ).toBe("admin");
  });

  it("does not route staff without an active role", () => {
    expect(resolveStaffWorkspace(new Set())).toBeNull();
    expect(workspaceHref("admin")).toBe("/staff/admin");
  });
});
