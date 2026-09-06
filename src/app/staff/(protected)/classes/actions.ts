"use server";

import { revalidatePath } from "next/cache";

import { CLASS_STATUSES, type ClassStatus } from "@/modules/classes/constants";
import {
  finalizeClass,
  reopenFinalizedClass,
} from "@/modules/classes/finalization";
import {
  buildClassSignInUrl,
  createClassQrDataUrl,
  getClassSignInBaseUrl,
} from "@/modules/classes/qr";
import {
  assignClassInstructor,
  createClassDraft,
  rotateClassSignInToken,
  saveClassComponent,
  transitionClass,
  updateClassDraft,
} from "@/modules/classes/services";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface ActionState {
  error?: string;
  classId?: string;
  signInUrl?: string;
  qrDataUrl?: string;
}

function read(formData: FormData, key: string): string {
  return formData.get(key)?.toString() ?? "";
}

function draftValues(formData: FormData) {
  const site = read(formData, "trainingSiteId");
  const reportingSystemIds = formData
    .getAll("reportingSystemIds")
    .map((value) => value.toString());
  return {
    courseId: read(formData, "courseId"),
    trainingSiteId: site || null,
    deliveryMethod: read(formData, "deliveryMethod") as
      | "in_person"
      | "virtual"
      | "hybrid",
    reportingSystemIds,
  };
}

export async function createClassAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  try {
    getClassSignInBaseUrl();
    const { classRecord, rawToken } = await createClassDraft(
      getDatabase(),
      actor,
      draftValues(formData),
    );
    const signInUrl = buildClassSignInUrl(rawToken);
    revalidatePath("/staff/classes");
    return {
      classId: classRecord.id,
      signInUrl,
      qrDataUrl: await createClassQrDataUrl(signInUrl),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create class.",
    };
  }
}

export async function updateClassAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  try {
    await updateClassDraft(
      getDatabase(),
      actor,
      classId,
      draftValues(formData),
    );
    revalidatePath(`/staff/classes/${classId}`);
    revalidatePath("/staff/classes");
    return { classId };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update class.",
    };
  }
}

export async function saveComponentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  try {
    await saveClassComponent(getDatabase(), actor, classId, {
      id: read(formData, "id") || undefined,
      title: read(formData, "title"),
      startsAt: read(formData, "startsAt"),
      endsAt: read(formData, "endsAt"),
      creditedHours: read(formData, "creditedHours"),
      position: read(formData, "position") || 0,
    });
    revalidatePath(`/staff/classes/${classId}`);
    return { classId };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save component.",
    };
  }
}

export async function assignInstructorAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  await assignClassInstructor(
    getDatabase(),
    actor,
    classId,
    read(formData, "userId"),
    read(formData, "isLead") === "true",
  );
  revalidatePath(`/staff/classes/${classId}`);
}

export async function transitionClassAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  const status = read(formData, "status") as ClassStatus;
  if (!Object.values(CLASS_STATUSES).includes(status)) {
    return { error: "Invalid class status." };
  }
  try {
    await transitionClass(
      getDatabase(),
      actor,
      classId,
      status,
      read(formData, "cancellationReason"),
    );
    revalidatePath(`/staff/classes/${classId}`);
    revalidatePath("/staff/classes");
    return { classId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update class status.",
    };
  }
}

export async function rotateTokenAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  try {
    getClassSignInBaseUrl();
    const rawToken = await rotateClassSignInToken(
      getDatabase(),
      actor,
      classId,
    );
    const signInUrl = buildClassSignInUrl(rawToken);
    return {
      classId,
      signInUrl,
      qrDataUrl: await createClassQrDataUrl(signInUrl),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not rotate access.",
    };
  }
}

export async function finalizeClassAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  try {
    await finalizeClass(getDatabase(), actor, classId);
    revalidatePath(`/staff/classes/${classId}`);
    revalidatePath("/staff/reporting");
    return { classId };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not finalize class.",
    };
  }
}

export async function reopenClassAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  try {
    await reopenFinalizedClass(
      getDatabase(),
      actor,
      classId,
      read(formData, "reason"),
    );
    revalidatePath(`/staff/classes/${classId}`);
    revalidatePath("/staff/reporting");
    return { classId };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not reopen class.",
    };
  }
}
