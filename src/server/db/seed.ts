import { inArray, sql } from "drizzle-orm";

import { PERMISSIONS, ROLE_CODES } from "@/modules/staff-auth/permissions";

import type { DatabaseTransaction } from "./client";
import { permissions, rolePermissions, roles } from "./schema";

export async function seedFoundation(
  transaction: DatabaseTransaction,
): Promise<void> {
  await transaction
    .insert(permissions)
    .values([
      {
        code: PERMISSIONS.STAFF_ACCESS,
        description: "Access protected staff pages",
      },
      {
        code: PERMISSIONS.STAFF_MANAGE,
        description: "Create and manage staff accounts",
      },
    ])
    .onConflictDoUpdate({
      target: permissions.code,
      set: { description: sql`excluded.description` },
    });

  await transaction
    .insert(roles)
    .values([
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
    ])
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
  const administratorRoleId = roleByCode.get(ROLE_CODES.ADMINISTRATOR);
  const instructorRoleId = roleByCode.get(ROLE_CODES.INSTRUCTOR);
  const trainingMajorRoleId = roleByCode.get(ROLE_CODES.TRAINING_MAJOR);
  const accessPermissionId = permissionByCode.get(PERMISSIONS.STAFF_ACCESS);
  const managePermissionId = permissionByCode.get(PERMISSIONS.STAFF_MANAGE);

  if (
    !administratorRoleId ||
    !instructorRoleId ||
    !trainingMajorRoleId ||
    !accessPermissionId ||
    !managePermissionId
  ) {
    throw new Error("Foundation seed could not resolve roles and permissions.");
  }

  await transaction
    .insert(rolePermissions)
    .values([
      { roleId: administratorRoleId, permissionId: accessPermissionId },
      { roleId: administratorRoleId, permissionId: managePermissionId },
      { roleId: instructorRoleId, permissionId: accessPermissionId },
      { roleId: trainingMajorRoleId, permissionId: accessPermissionId },
    ])
    .onConflictDoNothing();
}
