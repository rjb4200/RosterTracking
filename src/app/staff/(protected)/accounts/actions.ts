"use server";

import { revalidatePath } from "next/cache";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import type { ProfileActionState } from "@/modules/staff-auth/profile-contract";
import { updateStaffProfile } from "@/modules/staff-auth/profiles";
import {
  archiveStaffAccount,
  createStaffAccount,
  updateStaffAccount,
} from "@/modules/staff-auth/staff-accounts";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

export interface AccountActionState {
  error?: string;
  success?: string;
}

function read(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

export async function accountAction(
  _prev: AccountActionState | undefined,
  formData: FormData,
): Promise<AccountActionState> {
  const actor = await getCurrentStaff();
  if (!actor || !isAdministrator(actor.roleCodes)) {
    return { error: "Administrator access is required." };
  }
  try {
    if (read(formData, "operation") === "create") {
      await createStaffAccount(getDatabase(), actor.id, {
        username: read(formData, "username"),
        displayName: read(formData, "displayName"),
        password: read(formData, "password"),
        roleCode: read(formData, "roleCode") as
          | "administrator"
          | "instructor"
          | "training-major",
      });
    } else if (read(formData, "operation") === "update") {
      await updateStaffAccount(getDatabase(), actor.id, {
        userId: read(formData, "userId"),
        roleCode: read(formData, "roleCode") || undefined,
        isActive: read(formData, "isActive") === "true",
        password: read(formData, "password") || undefined,
      });
    } else {
      return { error: "Invalid account action." };
    }
    revalidatePath("/staff/accounts");
    return { success: "Staff account updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update account.",
    };
  }
}

export async function archiveAccountAction(formData: FormData): Promise<void> {
  const actor = await getCurrentStaff();
  if (!actor || !isAdministrator(actor.roleCodes)) return;
  await archiveStaffAccount(getDatabase(), actor.id, read(formData, "userId"));
  revalidatePath("/staff/accounts");
}

export async function profileAction(
  _prev: ProfileActionState | undefined,
  formData: FormData,
): Promise<ProfileActionState> {
  const actor = await getCurrentStaff();
  if (!actor || !isAdministrator(actor.roleCodes)) {
    return { error: "Administrator access is required." };
  }
  try {
    await updateStaffProfile(
      getDatabase(),
      actor.id,
      read(formData, "userId"),
      {
        ffn: read(formData, "ffn"),
        instructorLevel: read(formData, "instructorLevel"),
        emsProviderNumber: read(formData, "emsProviderNumber"),
      },
    );
    revalidatePath("/staff/accounts");
    return { success: "Profile updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update profile.",
    };
  }
}
