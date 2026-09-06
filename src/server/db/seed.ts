import { inArray, sql } from "drizzle-orm";

import { PERMISSIONS, ROLE_CODES } from "@/modules/staff-auth/permissions";

import type { DatabaseTransaction } from "./client";
import { permissions, rolePermissions, roles } from "./schema";

const permissionDefinitions = [
  {
    code: PERMISSIONS.STAFF_ACCESS,
    description: "Access protected staff pages",
  },
  {
    code: PERMISSIONS.STAFF_MANAGE,
    description: "Create and manage staff accounts",
  },
  {
    code: PERMISSIONS.STUDENTS_MANAGE,
    description: "Manage student records and memberships",
  },
  {
    code: PERMISSIONS.AGENCIES_MANAGE,
    description: "Manage agency records",
  },
  {
    code: PERMISSIONS.COURSES_MANAGE,
    description: "Manage courses and training codes",
  },
  {
    code: PERMISSIONS.SITES_MANAGE,
    description: "Manage training sites",
  },
  {
    code: PERMISSIONS.SITES_CREATE,
    description: "Create a new training site",
  },
  {
    code: PERMISSIONS.REPORTING_MANAGE,
    description: "Manage reporting systems and requirements",
  },
  {
    code: PERMISSIONS.OFFICIAL_ROSTERS_MANAGE,
    description: "Generate and retrieve official roster artifacts",
  },
  {
    code: PERMISSIONS.CLASSES_MANAGE,
    description: "Create and manage training classes",
  },
];

const roleDefinitions = [
  {
    code: ROLE_CODES.ADMINISTRATOR,
    name: "Administrator",
    description: "Full staff administration",
  },
  {
    code: ROLE_CODES.INSTRUCTOR,
    name: "Instructor",
    description: "Instructor staff access",
  },
  {
    code: ROLE_CODES.TRAINING_MAJOR,
    name: "Training Major",
    description: "Training Major staff access",
  },
];

const grants: Array<[string, string]> = [
  // Administrator: everything.
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.STAFF_ACCESS],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.STAFF_MANAGE],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.STUDENTS_MANAGE],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.AGENCIES_MANAGE],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.COURSES_MANAGE],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.SITES_MANAGE],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.SITES_CREATE],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.REPORTING_MANAGE],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.OFFICIAL_ROSTERS_MANAGE],
  [ROLE_CODES.ADMINISTRATOR, PERMISSIONS.CLASSES_MANAGE],
  // Training Major: manage reference data and reporting, but not staff accounts.
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.STAFF_ACCESS],
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.STUDENTS_MANAGE],
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.AGENCIES_MANAGE],
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.COURSES_MANAGE],
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.SITES_MANAGE],
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.SITES_CREATE],
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.REPORTING_MANAGE],
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.OFFICIAL_ROSTERS_MANAGE],
  [ROLE_CODES.TRAINING_MAJOR, PERMISSIONS.CLASSES_MANAGE],
  // Instructor: staff access plus quick site creation.
  [ROLE_CODES.INSTRUCTOR, PERMISSIONS.STAFF_ACCESS],
  [ROLE_CODES.INSTRUCTOR, PERMISSIONS.SITES_CREATE],
  [ROLE_CODES.INSTRUCTOR, PERMISSIONS.CLASSES_MANAGE],
];

export async function seedFoundation(
  transaction: DatabaseTransaction,
): Promise<void> {
  await transaction
    .insert(permissions)
    .values(permissionDefinitions)
    .onConflictDoUpdate({
      target: permissions.code,
      set: { description: sql`excluded.description` },
    });

  await transaction
    .insert(roles)
    .values(roleDefinitions)
    .onConflictDoUpdate({
      target: roles.code,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  const permissionRows = await transaction
    .select()
    .from(permissions)
    .where(inArray(permissions.code, Object.values(PERMISSIONS)));
  const roleRows = await transaction
    .select()
    .from(roles)
    .where(inArray(roles.code, Object.values(ROLE_CODES)));

  const permissionByCode = new Map(
    permissionRows.map((permission) => [permission.code, permission.id]),
  );
  const roleByCode = new Map(roleRows.map((role) => [role.code, role.id]));

  const rows = grants.flatMap(([roleCode, permissionCode]) => {
    const roleId = roleByCode.get(roleCode);
    const permissionId = permissionByCode.get(permissionCode);
    if (!roleId || !permissionId) {
      throw new Error(
        `Foundation seed could not resolve role '${roleCode}' or permission '${permissionCode}'.`,
      );
    }
    return [{ roleId, permissionId }];
  });

  await transaction.insert(rolePermissions).values(rows).onConflictDoNothing();
}
