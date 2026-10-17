import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";

import { getDatabase } from "@/server/db/client";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/server/db/schema";

import { authOptions } from "./options";
import { hasPermission, type PermissionCode } from "./permissions";
import { isSessionCurrent } from "./policy";

export interface CurrentStaff {
  id: string;
  username: string;
  email: string | null;
  // The account's most recent successful sign-in. Used as the marker for
  // "current login" so a one-time dismissal can reset on the next login.
  lastLoginAt: Date | null;
  displayName: string;
  permissions: ReadonlySet<string>;
  roleCodes: ReadonlySet<string>;
}

export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;

  if (!sessionUser?.id || typeof sessionUser.sessionVersion !== "number") {
    return null;
  }

  const db = getDatabase();
  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (!account || !isSessionCurrent(sessionUser, account)) {
    return null;
  }

  const [permissionRows, roleRows] = await Promise.all([
    db
      .select({ code: permissions.code })
      .from(userRoles)
      .innerJoin(
        roles,
        and(eq(roles.id, userRoles.roleId), eq(roles.isActive, true)),
      )
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(userRoles.userId, account.id)),
    db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(
        roles,
        and(eq(roles.id, userRoles.roleId), eq(roles.isActive, true)),
      )
      .where(eq(userRoles.userId, account.id)),
  ]);

  return {
    id: account.id,
    username: account.username,
    email: account.email,
    lastLoginAt: account.lastLoginAt,
    displayName: account.displayName,
    permissions: new Set(permissionRows.map(({ code }) => code)),
    roleCodes: new Set(roleRows.map(({ code }) => code)),
  };
}

export async function requireStaff(): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) {
    throw new AuthenticationRequiredError();
  }
  return staff;
}

export async function requirePermission(
  permission: PermissionCode,
): Promise<CurrentStaff> {
  const staff = await requireStaff();
  if (!hasPermission(staff.permissions, permission)) {
    throw new PermissionDeniedError(permission);
  }
  return staff;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(permission: string) {
    super(`Permission required: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}
