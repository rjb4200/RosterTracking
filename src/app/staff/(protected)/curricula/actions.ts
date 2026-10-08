"use server";

import { revalidatePath } from "next/cache";

import * as reference from "@/modules/reference/services";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

function read(formData: FormData, key: string): string {
  return formData.get(key)?.toString() ?? "";
}

export async function setCurriculumActiveAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.CURRICULA_MANAGE);
  const id = read(formData, "id");
  await reference.setCurriculumActive(
    getDatabase(),
    actor,
    id,
    read(formData, "isActive") === "true",
  );
  revalidatePath("/staff/curricula");
}

export async function archiveCurriculumAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.CURRICULA_MANAGE);
  const id = read(formData, "id");
  await reference.archiveCurriculum(getDatabase(), actor, id);
  revalidatePath("/staff/curricula");
}
