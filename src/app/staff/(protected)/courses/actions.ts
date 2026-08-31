"use server";

import { revalidatePath } from "next/cache";

import * as reference from "@/modules/reference/services";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface ActionState {
  error?: string;
}

function read(formData: FormData, key: string): string {
  return formData.get(key)?.toString() ?? "";
}

export async function createCourseAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.COURSES_MANAGE);
  try {
    await reference.createCourse(getDatabase(), actor, {
      name: read(formData, "name"),
      description: read(formData, "description"),
      defaultHours: read(formData, "defaultHours")
        ? Number(read(formData, "defaultHours"))
        : undefined,
      trainingCodeId: read(formData, "trainingCodeId"),
    });
    revalidatePath("/staff/courses");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create course.",
    };
  }
}

export async function updateCourseAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.COURSES_MANAGE);
  const id = read(formData, "id");
  try {
    await reference.updateCourse(getDatabase(), actor, id, {
      name: read(formData, "name"),
      description: read(formData, "description"),
      defaultHours: read(formData, "defaultHours")
        ? Number(read(formData, "defaultHours"))
        : undefined,
      trainingCodeId: read(formData, "trainingCodeId"),
    });
    revalidatePath(`/staff/courses/${id}`);
    revalidatePath("/staff/courses");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update course.",
    };
  }
}

export async function setCourseActiveAction(formData: FormData): Promise<void> {
  const actor = await requireActor(PERMISSIONS.COURSES_MANAGE);
  const id = read(formData, "id");
  await reference.setCourseActive(
    getDatabase(),
    actor,
    id,
    read(formData, "isActive") === "true",
  );
  revalidatePath(`/staff/courses/${id}`);
  revalidatePath("/staff/courses");
}
