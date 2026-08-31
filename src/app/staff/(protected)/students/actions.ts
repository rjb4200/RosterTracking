"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function createStudentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.STUDENTS_MANAGE);
  try {
    const student = await reference.createStudent(getDatabase(), actor, {
      firstName: read(formData, "firstName"),
      lastName: read(formData, "lastName"),
      phone: read(formData, "phone"),
      email: read(formData, "email"),
      studentNumber: read(formData, "studentNumber"),
    });
    redirect(`/staff/students/${student.id}`);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create student.",
    };
  }
}

export async function updateStudentAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.STUDENTS_MANAGE);
  const id = read(formData, "id");
  try {
    await reference.updateStudent(getDatabase(), actor, id, {
      firstName: read(formData, "firstName"),
      lastName: read(formData, "lastName"),
      phone: read(formData, "phone"),
      email: read(formData, "email"),
      studentNumber: read(formData, "studentNumber"),
    });
    revalidatePath(`/staff/students/${id}`);
    revalidatePath("/staff/students");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update student.",
    };
  }
}

export async function setStudentActiveAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.STUDENTS_MANAGE);
  const id = read(formData, "id");
  const isActive = read(formData, "isActive") === "true";
  await reference.setStudentActive(getDatabase(), actor, id, isActive);
  revalidatePath(`/staff/students/${id}`);
  revalidatePath("/staff/students");
}

export async function setMembershipAction(formData: FormData): Promise<void> {
  const actor = await requireActor(PERMISSIONS.STUDENTS_MANAGE);
  const studentId = read(formData, "studentId");
  const agencyId = read(formData, "agencyId");
  await reference.setStudentMembership(
    getDatabase(),
    actor,
    studentId,
    agencyId,
    {
      isPrimary: read(formData, "isPrimary") === "true",
      isActive: read(formData, "isActive") === "true",
    },
  );
  revalidatePath(`/staff/students/${studentId}`);
}

export async function upsertCredentialAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.STUDENTS_MANAGE);
  const studentId = read(formData, "studentId");
  const credentialTypeId = read(formData, "credentialTypeId");
  try {
    await reference.upsertStudentCredential(
      getDatabase(),
      actor,
      studentId,
      credentialTypeId,
      {
        value: read(formData, "value"),
        expirationDate: read(formData, "expirationDate"),
      },
    );
    revalidatePath(`/staff/students/${studentId}`);
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save credential.",
    };
  }
}
