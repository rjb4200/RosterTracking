"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  createOpenClass,
  getClassPublicAccess,
  rotateClassSignInToken,
  saveClassComponent,
  transitionClass,
  updateClass,
} from "@/modules/classes/services";
import { emailOfficialRoster } from "@/modules/official-roster-pdfs/service";
import { createAgency, createSite } from "@/modules/reference/services";
import { requireStaff } from "@/modules/staff-auth/authorization";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface ActionState {
  error?: string;
  classId?: string;
  signInUrl?: string;
  qrDataUrl?: string;
  accessPin?: string | null;
}

export interface CreateSiteActionState {
  error?: string;
  site?: { id: string; name: string };
}

export interface CreateAgencyActionState {
  error?: string;
  agency?: { id: string; name: string };
}

export interface OfficialRosterEmailActionState {
  error?: string;
  success?: string;
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
    name: read(formData, "name"),
    trainingSiteId: site || null,
    hostAgencyId: read(formData, "hostAgencyId"),
    deliveryMethod: read(formData, "deliveryMethod") as
      | "classroom"
      | "hands_on"
      | "online"
      | "hybrid",
    reportingSystemIds,
    accessPinEnabled: read(formData, "accessPinEnabled") === "on",
    objectives: read(formData, "objectives"),
    courseType: read(formData, "courseType") as
      | ""
      | "continuing_education"
      | "initial_certification"
      | "refresher",
    courseNumber: read(formData, "courseNumber"),
    mtuEquipmentUsed: read(formData, "mtuEquipmentUsed"),
    mtuMileage: read(formData, "mtuMileage"),
    mtuUsedSupplies: read(formData, "mtuUsedSupplies"),
  };
}

function readSubjects(formData: FormData) {
  const codes = formData.getAll("fireTrainingCodeId").map(String);
  const names = formData.getAll("fireClassName").map(String);
  const curriculumIds = formData.getAll("fireCurriculumId").map(String);
  const lessonPlans = formData.getAll("fireLessonPlan").map(String);
  return codes
    .map((trainingCodeId, index) => ({
      trainingCodeId,
      className: names[index] ?? "",
      curriculumId: curriculumIds[index] ?? "",
      lessonPlan: lessonPlans[index] ?? "",
    }))
    .filter(
      (subject) =>
        Boolean(subject.trainingCodeId) && Boolean(subject.className.trim()),
    );
}

export async function createClassAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  try {
    getClassSignInBaseUrl();
    const { classRecord, accessPin } = await createOpenClass(
      getDatabase(),
      actor,
      {
        ...draftValues(formData),
        startsAt: read(formData, "startsAt"),
        creditedHours: read(formData, "creditedHours"),
        leadInstructorId: read(formData, "leadInstructorId"),
        subjects: readSubjects(formData),
      },
    );
    const signInUrl = buildClassSignInUrl(classRecord.publicCode ?? "");
    revalidatePath("/staff/classes");
    revalidatePath("/staff");
    return {
      classId: classRecord.id,
      signInUrl,
      qrDataUrl: await createClassQrDataUrl(signInUrl),
      accessPin,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create class.",
    };
  }
}

export async function createInlineSiteAction(
  _prev: CreateSiteActionState | undefined,
  formData: FormData,
): Promise<CreateSiteActionState> {
  const actor = await requireActor(PERMISSIONS.SITES_CREATE);
  try {
    const site = await createSite(getDatabase(), actor, {
      name: read(formData, "name"),
      address: read(formData, "address"),
      city: read(formData, "city"),
      state: read(formData, "state"),
      zip: read(formData, "zip"),
    });
    revalidatePath("/staff/classes/new");
    return { site: { id: site.id, name: site.name } };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create site.",
    };
  }
}

export async function createInlineAgencyAction(
  _prev: CreateAgencyActionState | undefined,
  formData: FormData,
): Promise<CreateAgencyActionState> {
  const actor = await requireActor(PERMISSIONS.AGENCIES_MANAGE);
  try {
    const agency = await createAgency(getDatabase(), actor, {
      name: read(formData, "name"),
      type: read(formData, "type"),
      address: read(formData, "address"),
      city: read(formData, "city"),
      state: read(formData, "state"),
      zip: read(formData, "zip"),
      contactName: read(formData, "contactName"),
      phone: read(formData, "phone"),
      email: read(formData, "email"),
    });
    revalidatePath("/staff/classes/new");
    return { agency: { id: agency.id, name: agency.name } };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create agency.",
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
    await updateClass(getDatabase(), actor, classId, draftValues(formData));
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
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update class status.",
    };
  }
  revalidatePath(`/staff/classes/${classId}`);
  revalidatePath("/staff/classes");
  // Finishing attendance hands the operator to the review step, which is where
  // the class and its roster are confirmed and corrected. The redirect is
  // raised outside the try/catch because it works by throwing.
  if (status === CLASS_STATUSES.COMPLETED) {
    redirect(`/staff/classes/${classId}/review`);
  }
  return { classId };
}

export async function rotateTokenAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  try {
    getClassSignInBaseUrl();
    await rotateClassSignInToken(getDatabase(), actor, classId);
    const access = await getClassPublicAccess(getDatabase(), actor, classId);
    const signInUrl = buildClassSignInUrl(access.publicCode);
    return {
      classId,
      signInUrl,
      qrDataUrl: await createClassQrDataUrl(signInUrl),
      accessPin: access.accessPin,
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
    revalidatePath(`/staff/classes/${classId}/review`);
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
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not reopen class.",
    };
  }
  revalidatePath(`/staff/classes/${classId}`);
  revalidatePath(`/staff/classes/${classId}/review`);
  revalidatePath("/staff/reporting");
  // Reopening returns the class to its editable open state, which the review
  // route does not render, so send the operator to the class detail route.
  redirect(`/staff/classes/${classId}`);
}

export async function sendOfficialRosterEmailAction(
  _prev: OfficialRosterEmailActionState | undefined,
  formData: FormData,
): Promise<OfficialRosterEmailActionState> {
  try {
    const actor = await requireStaff();
    const formType = read(formData, "formType");
    if (formType !== "kfs-1a" && formType !== "kbems-e16") {
      return { error: "Select an official roster form." };
    }
    await emailOfficialRoster(
      getDatabase(),
      actor,
      read(formData, "revisionId"),
      formType,
      read(formData, "recipient"),
    );
    return { success: "Official roster email accepted for delivery." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not send the official roster email.",
    };
  }
}
