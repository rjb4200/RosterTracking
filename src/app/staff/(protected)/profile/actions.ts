"use server";

import { revalidatePath } from "next/cache";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import type { ProfileActionState } from "@/modules/staff-auth/profile-contract";
import { updateOwnProfile } from "@/modules/staff-auth/profiles";
import { getDatabase } from "@/server/db/client";

function read(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

export async function updateOwnProfileAction(
  _prev: ProfileActionState | undefined,
  formData: FormData,
): Promise<ProfileActionState> {
  const actor = await getCurrentStaff();
  if (!actor) return { error: "Authentication required." };
  try {
    await updateOwnProfile(getDatabase(), actor.id, {
      ffn: read(formData, "ffn"),
      instructorLevel: read(formData, "instructorLevel"),
      emsProviderNumber: read(formData, "emsProviderNumber"),
    });
    revalidatePath("/staff/profile");
    return { success: "Profile updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update profile.",
    };
  }
}
