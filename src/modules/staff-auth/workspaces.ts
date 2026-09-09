import { ROLE_CODES } from "./permissions";

export type StaffWorkspace = "admin" | "instructor";

export function isAdministrator(roleCodes: ReadonlySet<string>) {
  return roleCodes.has(ROLE_CODES.ADMINISTRATOR);
}

export function resolveStaffWorkspace(
  roleCodes: ReadonlySet<string>,
): StaffWorkspace | null {
  if (
    roleCodes.has(ROLE_CODES.ADMINISTRATOR) ||
    roleCodes.has(ROLE_CODES.TRAINING_MAJOR)
  ) {
    return "admin";
  }
  if (roleCodes.has(ROLE_CODES.INSTRUCTOR)) return "instructor";
  return null;
}

export function workspaceHref(workspace: StaffWorkspace) {
  return `/staff/${workspace}`;
}
