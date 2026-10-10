"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

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
  updateClassMtuUsage,
} from "@/modules/classes/services";
import {
  dispatchCertificateDeliveries,
  resendParticipantCertificate,
} from "@/modules/completion-certificates/service";
import {
  dispatchTrainingNoticeDeliveries,
  type NoticeVariant,
  resendParticipantNotice,
  sendParticipantNoticeOnDemand,
} from "@/modules/individual-training-notices/service";
import { emailOfficialRoster } from "@/modules/official-roster-pdfs/service";
import { createAgency, createSite } from "@/modules/reference/services";
import { requireStaff } from "@/modules/staff-auth/authorization";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface ActionState {
  error?: string;
  success?: string;
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

export interface CertificateResendActionState {
  error?: string;
  success?: string;
}

function read(formData: FormData, key: string): string {
  return formData.get(key)?.toString() ?? "";
}

function readMtuSelections(formData: FormData) {
  const equipmentIds = formData.getAll("mtuEquipmentIds").map(String);
  const supplies = formData.getAll("mtuSupplyIds").map((value) => {
    const itemId = value.toString();
    return { itemId, quantity: read(formData, `mtuSupplyQty:${itemId}`) };
  });
  return { equipmentIds, supplies };
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
    mtuEquipmentIds: readMtuSelections(formData).equipmentIds,
    mtuSupplyItems: readMtuSelections(formData).supplies,
  };
}

function readSubjects(formData: FormData) {
  const codes = formData.getAll("fireTrainingCodeId").map(String);
  const names = formData.getAll("fireClassName").map(String);
  const curriculumIds = formData.getAll("fireCurriculumId").map(String);
  const curriculumNames = formData.getAll("fireCurriculumName").map(String);
  const curriculumChapters = formData
    .getAll("fireCurriculumChapter")
    .map(String);
  const lessonPlans = formData.getAll("fireLessonPlan").map(String);
  return codes
    .map((trainingCodeId, index) => ({
      trainingCodeId,
      className: names[index] ?? "",
      curriculumId: curriculumIds[index] ?? "",
      curriculumName: curriculumNames[index] ?? "",
      curriculumChapter: curriculumChapters[index] ?? "",
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
      trainingCodeId: read(formData, "trainingCodeId"),
      className: read(formData, "className"),
      curriculumId: read(formData, "curriculumId"),
      curriculumName: read(formData, "curriculumName"),
      curriculumChapter: read(formData, "curriculumChapter"),
      lessonPlan: read(formData, "lessonPlan"),
      method: read(formData, "method") as "" | "cr" | "ho" | "ol" | "cr,ol",
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
  return { classId };
}

export async function updateMtuUsageAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  try {
    const selections = readMtuSelections(formData);
    await updateClassMtuUsage(getDatabase(), actor, classId, {
      equipmentUsed: read(formData, "equipmentUsed"),
      mileage: read(formData, "mileage"),
      usedSupplies: read(formData, "usedSupplies"),
      equipmentIds: selections.equipmentIds,
      supplies: selections.supplies,
    });
    revalidatePath(`/staff/classes/${classId}`);
    revalidatePath(`/staff/classes/${classId}/review`);
    revalidatePath(`/staff/classes/${classId}/edit`);
    return { success: "MTU usage saved." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update MTU usage.",
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
    const mtuSelections = readMtuSelections(formData);
    const revision = await finalizeClass(
      getDatabase(),
      actor,
      classId,
      {
        certified: read(formData, "certified") === "true",
        typedName: read(formData, "typedName"),
      },
      {
        confirmed: read(formData, "mtuConfirmed") === "true",
        equipmentIds: mtuSelections.equipmentIds,
        supplies: mtuSelections.supplies,
      },
    );
    // Deliver certificates after the response; a delivery failure is recorded
    // on its delivery row and never affects the finalized class.
    after(async () => {
      await dispatchCertificateDeliveries(getDatabase(), actor, revision.id);
      await dispatchTrainingNoticeDeliveries(getDatabase(), actor, revision.id);
    });
    revalidatePath(`/staff/classes/${classId}`);
    revalidatePath(`/staff/classes/${classId}/review`);
    revalidatePath("/staff/reporting");
    revalidatePath("/staff/classes");
    revalidatePath("/staff/instructor");
    revalidatePath("/staff/admin");
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
    if (formType !== "kfs-1a") {
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

export async function resendParticipantCertificateAction(
  _prev: CertificateResendActionState | undefined,
  formData: FormData,
): Promise<CertificateResendActionState> {
  const classId = read(formData, "classId");
  try {
    const actor = await requireStaff();
    const result = await resendParticipantCertificate(
      getDatabase(),
      actor,
      read(formData, "revisionId"),
      read(formData, "attendanceId"),
      read(formData, "recipient"),
    );
    revalidatePath(`/staff/classes/${classId}/review`);
    return {
      success:
        result.state === "delivered"
          ? `Certificate sent to ${result.recipient}.`
          : `Could not send the certificate to ${result.recipient}.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not send the certificate.",
    };
  }
}

export async function resendParticipantNoticeAction(
  _prev: CertificateResendActionState | undefined,
  formData: FormData,
): Promise<CertificateResendActionState> {
  const classId = read(formData, "classId");
  try {
    const actor = await requireStaff();
    const result = await resendParticipantNotice(
      getDatabase(),
      actor,
      read(formData, "revisionId"),
      read(formData, "attendanceId"),
      read(formData, "recipient"),
    );
    revalidatePath(`/staff/classes/${classId}/review`);
    return {
      success:
        result.state === "delivered"
          ? `Training notice sent to ${result.recipient}.`
          : `Could not send the training notice to ${result.recipient}.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not send the training notice.",
    };
  }
}

export async function emailTrainingNoticeAction(
  _prev: CertificateResendActionState | undefined,
  formData: FormData,
): Promise<CertificateResendActionState> {
  const classId = read(formData, "classId");
  const variant: NoticeVariant =
    read(formData, "variant") === "white" ? "white" : "yellow";
  try {
    const actor = await requireStaff();
    const result = await sendParticipantNoticeOnDemand(
      getDatabase(),
      actor,
      read(formData, "revisionId"),
      read(formData, "attendanceId"),
      variant,
      read(formData, "recipient"),
    );
    revalidatePath(`/staff/classes/${classId}/review`);
    return {
      success:
        result.state === "delivered"
          ? `Training notice sent to ${result.recipient}.`
          : `Could not send the training notice to ${result.recipient}.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not send the training notice.",
    };
  }
}
