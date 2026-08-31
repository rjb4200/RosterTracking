import { redirect } from "next/navigation";

import { getCurrentStaff, requirePermission } from "./authorization";
import type { PermissionCode } from "./permissions";

export interface Actor {
  id: string;
  username: string;
}

export async function requirePagePermission(
  permission: PermissionCode,
): Promise<Actor> {
  const staff = await getCurrentStaff();
  if (!staff?.permissions.has(permission)) {
    redirect("/staff");
  }
  return { id: staff.id, username: staff.username };
}

export async function requireActor(permission: PermissionCode): Promise<Actor> {
  const staff = await requirePermission(permission);
  return { id: staff.id, username: staff.username };
}
