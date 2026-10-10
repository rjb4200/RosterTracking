export const PERMISSIONS = {
  STAFF_ACCESS: "staff.access",
  STAFF_MANAGE: "staff.manage",
  STUDENTS_MANAGE: "students.manage",
  AGENCIES_MANAGE: "agencies.manage",
  TRAINING_CODES_MANAGE: "training-codes.manage",
  CURRICULA_MANAGE: "curricula.manage",
  SITES_MANAGE: "sites.manage",
  SITES_CREATE: "sites.create",
  REPORTING_MANAGE: "reporting.manage",
  OFFICIAL_ROSTERS_MANAGE: "official-rosters.manage",
  CLASSES_MANAGE: "classes.manage",
  MTU_CATALOG_MANAGE: "mtu-catalog.manage",
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
  TRAINING_MAJOR: "training-major",
} as const;
