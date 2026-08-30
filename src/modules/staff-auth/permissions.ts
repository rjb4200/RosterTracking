export const PERMISSIONS = {
  STAFF_ACCESS: "staff.access",
  STAFF_MANAGE: "staff.manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(
  grantedPermissions: ReadonlySet<string>,
  required: PermissionCode,
): boolean {
  return grantedPermissions.has(required);
}

export const ROLE_CODES = {
  ADMINISTRATOR: "administrator",
  INSTRUCTOR: "instructor",
} as const;
