"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeCredentialValue } from "@/modules/reference/crypto";
import { normalizePhone } from "@/modules/reference/masking";
import {
  type AttendanceConfirmationResult,
  confirmAttendance,
} from "@/modules/student-sign-in/attendance";
import {
  SIGN_IN_CONTEXT_COOKIE_NAME,
  signInCookieOptions,
} from "@/modules/student-sign-in/context";
import {
  clearRecoveryForNotMe,
  confirmRecognizedStudent,
  recognizeStudent,
  stagePendingRecognizedStudent,
} from "@/modules/student-sign-in/identification";
import { confirmationDestination } from "@/modules/student-sign-in/page-model";
import {
  stageGuestParticipant,
  stageRegularRequirements,
} from "@/modules/student-sign-in/participants";
import {
  acquirePublicRateLimit,
  PUBLIC_RATE_LIMIT_OPERATIONS,
  type PublicRateLimitLease,
  type PublicRateLimitOperation,
  rateLimitIdentifierFingerprint,
  recordPublicRateLimitFailure,
} from "@/modules/student-sign-in/rate-limit";
import {
  REMEMBERED_DEVICE_COOKIE_NAME,
  rememberedDeviceCookieOptions,
  revokeRememberedDevice,
} from "@/modules/student-sign-in/remembered-device";
import {
  getTrustedRequestMetadata,
  validateSameOriginRequest,
} from "@/modules/student-sign-in/request-security";
import {
  loadSignInWorkflow,
  updateSignInWorkflow,
} from "@/modules/student-sign-in/workflow";
import { getDatabase } from "@/server/db/client";

const GENERIC_ERROR = "/sign-in?notice=unable";
const REQUIRED_ERROR = "/sign-in?notice=required";
const LIMITED_ERROR = "/sign-in?notice=limited";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function collectPrefixed(formData: FormData, prefix: string) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter(
        (entry): entry is [string, string] =>
          entry[0].startsWith(prefix) && typeof entry[1] === "string",
      )
      .map(([key, value]) => [key.slice(prefix.length), value]),
  );
}

function phoneFingerprintInput(value: string) {
  try {
    return normalizePhone(value);
  } catch {
    return value.trim();
  }
}

async function requestContext() {
  if (!(await validateSameOriginRequest())) {
    throw new Error("Mutation request origin is unavailable.");
  }
  const cookieStore = await cookies();
  const signedContext = cookieStore.get(SIGN_IN_CONTEXT_COOKIE_NAME)?.value;
  if (!signedContext) throw new Error("Sign-in context is unavailable.");
  const db = getDatabase();
  const [loaded, metadata] = await Promise.all([
    loadSignInWorkflow(db, signedContext),
    getTrustedRequestMetadata(),
  ]);
  return { cookieStore, db, loaded, metadata, signedContext };
}

async function acquireLimits(
  context: Awaited<ReturnType<typeof requestContext>>,
  operations: { operation: PublicRateLimitOperation; identifier?: string }[],
) {
  const leases: PublicRateLimitLease[] = [];
  for (const item of operations) {
    const lease = await acquirePublicRateLimit(context.db, {
      classId: context.loaded.context.classId,
      operation: item.operation,
      requestSourceFingerprint: context.metadata.requestSourceFingerprint,
      identifierFingerprint: item.identifier
        ? rateLimitIdentifierFingerprint(item.operation, item.identifier)
        : undefined,
    });
    leases.push(lease);
    if (!lease.allowed) return { allowed: false, leases };
  }
  return { allowed: true, leases };
}

async function recordFailures(
  db: ReturnType<typeof getDatabase>,
  leases: PublicRateLimitLease[],
) {
  await Promise.all(
    leases.map((lease) => recordPublicRateLimitFailure(db, lease)),
  );
}

export async function lookupCurrentPhone(formData: FormData) {
  let destination = GENERIC_ERROR;
  let db: ReturnType<typeof getDatabase> | undefined;
  let leases: PublicRateLimitLease[] = [];
  try {
    const context = await requestContext();
    db = context.db;
    const submittedPhone = text(formData, "phone");
    const limit = await acquireLimits(context, [
      { operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE },
      {
        operation: PUBLIC_RATE_LIMIT_OPERATIONS.CURRENT_PHONE_LOOKUP,
        identifier: phoneFingerprintInput(submittedPhone),
      },
    ]);
    leases = limit.leases;
    if (!limit.allowed) {
      destination = LIMITED_ERROR;
    } else {
      const phone = normalizePhone(submittedPhone);
      const recognition = await recognizeStudent(context.db, {
        currentPhone: phone,
      });
      if (recognition.status === "identified") {
        await updateSignInWorkflow(
          context.db,
          context.signedContext,
          stagePendingRecognizedStudent(context.loaded.state, recognition),
        );
        destination = "/sign-in";
      } else {
        await updateSignInWorkflow(context.db, context.signedContext, {
          ...context.loaded.state,
          participant: null,
          selectedAgencyId: null,
          pendingNewPhone: phone,
        });
        await recordFailures(context.db, leases);
        destination = "/sign-in?notice=not-found";
      }
    }
  } catch {
    if (db) await recordFailures(db, leases);
  }
  redirect(destination);
}

export async function recoverChangedPhone(formData: FormData) {
  let destination = "/sign-in?step=recovery&notice=recovery";
  let db: ReturnType<typeof getDatabase> | undefined;
  let leases: PublicRateLimitLease[] = [];
  try {
    const context = await requestContext();
    db = context.db;
    const newPhone = context.loaded.state.pendingNewPhone;
    const submittedPriorPhone = text(formData, "priorPhone");
    const credentialType = text(formData, "credentialType");
    const submittedCredential = text(formData, "credentialValue");
    if (
      !newPhone ||
      (credentialType !== "ffn" && credentialType !== "kemsis")
    ) {
      throw new Error("Recovery is unavailable.");
    }
    const verificationOperation =
      credentialType === "ffn"
        ? PUBLIC_RATE_LIMIT_OPERATIONS.FFN_VERIFICATION
        : PUBLIC_RATE_LIMIT_OPERATIONS.KEMSIS_VERIFICATION;
    const limit = await acquireLimits(context, [
      { operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE },
      {
        operation: PUBLIC_RATE_LIMIT_OPERATIONS.PRIOR_PHONE_RECOVERY,
        identifier: phoneFingerprintInput(submittedPriorPhone),
      },
      {
        operation: verificationOperation,
        identifier: submittedCredential.trim(),
      },
    ]);
    leases = limit.leases;
    if (!limit.allowed) {
      destination = LIMITED_ERROR;
    } else {
      const priorPhone = normalizePhone(submittedPriorPhone);
      const credentialValue = normalizeCredentialValue(submittedCredential);
      const recognition = await recognizeStudent(context.db, {
        recovery: {
          priorPhone,
          newPhone,
          credentialType,
          credentialValue,
        },
      });
      if (recognition.status !== "identified") {
        await recordFailures(context.db, leases);
      } else {
        await updateSignInWorkflow(
          context.db,
          context.signedContext,
          stagePendingRecognizedStudent(context.loaded.state, recognition),
        );
        destination = "/sign-in";
      }
    }
  } catch {
    if (db) await recordFailures(db, leases);
  }
  redirect(destination);
}

export async function confirmProfile() {
  let destination = GENERIC_ERROR;
  let db: ReturnType<typeof getDatabase> | undefined;
  let leases: PublicRateLimitLease[] = [];
  try {
    const context = await requestContext();
    db = context.db;
    const participant = context.loaded.state.participant;
    if (participant?.kind !== "regular")
      throw new Error("Profile unavailable.");
    const limit = await acquireLimits(context, [
      { operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE },
    ]);
    leases = limit.leases;
    if (!limit.allowed) {
      destination = LIMITED_ERROR;
    } else {
      const recognition = {
        status: "identified" as const,
        method: participant.signInMethod,
        rememberedDeviceId: participant.rememberedDeviceId,
        replacementPhone: participant.replacementPhone,
        student: { id: participant.studentId, firstName: "", lastName: "" },
      };
      await updateSignInWorkflow(
        context.db,
        context.signedContext,
        confirmRecognizedStudent(context.loaded.state, recognition),
      );
      destination = "/sign-in";
    }
  } catch {
    if (db) await recordFailures(db, leases);
  }
  redirect(destination);
}

export async function notMe() {
  let destination = GENERIC_ERROR;
  let db: ReturnType<typeof getDatabase> | undefined;
  let leases: PublicRateLimitLease[] = [];
  try {
    const context = await requestContext();
    db = context.db;
    const limit = await acquireLimits(context, [
      { operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE },
    ]);
    leases = limit.leases;
    if (!limit.allowed) {
      destination = LIMITED_ERROR;
    } else {
      const rememberedToken = context.cookieStore.get(
        REMEMBERED_DEVICE_COOKIE_NAME,
      )?.value;
      if (rememberedToken) {
        await revokeRememberedDevice(context.db, rememberedToken);
      }
      await clearRecoveryForNotMe(
        context.db,
        context.signedContext,
        context.loaded.state,
      );
      context.cookieStore.set(
        REMEMBERED_DEVICE_COOKIE_NAME,
        "",
        rememberedDeviceCookieOptions(0),
      );
      destination = "/sign-in";
    }
  } catch {
    if (db) await recordFailures(db, leases);
  }
  redirect(destination);
}

function credentialsFromForm(formData: FormData) {
  return Object.entries(collectPrefixed(formData, "credential:")).map(
    ([credentialTypeId, value]) => ({ credentialTypeId, value }),
  );
}

export async function saveRegularDetails(formData: FormData) {
  let destination = REQUIRED_ERROR;
  let db: ReturnType<typeof getDatabase> | undefined;
  let leases: PublicRateLimitLease[] = [];
  try {
    const context = await requestContext();
    db = context.db;
    const limit = await acquireLimits(context, [
      { operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE },
    ]);
    leases = limit.leases;
    if (!limit.allowed) {
      destination = LIMITED_ERROR;
    } else {
      await stageRegularRequirements(context.db, context.signedContext, {
        fields: collectPrefixed(formData, "field:"),
        credentials: credentialsFromForm(formData),
        agencyId: text(formData, "agencyId"),
      });
      destination = "/sign-in";
    }
  } catch {
    if (db) await recordFailures(db, leases);
  }
  redirect(destination);
}

export async function saveGuestDetails(formData: FormData) {
  let destination = "/sign-in?step=guest&notice=required";
  let db: ReturnType<typeof getDatabase> | undefined;
  let leases: PublicRateLimitLease[] = [];
  try {
    const context = await requestContext();
    db = context.db;
    const limit = await acquireLimits(context, [
      { operation: PUBLIC_RATE_LIMIT_OPERATIONS.STAGING_WRITE },
    ]);
    leases = limit.leases;
    if (!limit.allowed) {
      destination = LIMITED_ERROR;
    } else {
      await stageGuestParticipant(context.db, context.signedContext, {
        firstName: text(formData, "firstName"),
        lastName: text(formData, "lastName"),
        fields: collectPrefixed(formData, "field:"),
        credentials: credentialsFromForm(formData),
        agencyId: text(formData, "agencyId"),
      });
      destination = "/sign-in";
    }
  } catch {
    if (db) await recordFailures(db, leases);
  }
  redirect(destination);
}

export async function confirmSignIn(formData: FormData) {
  let destination = GENERIC_ERROR;
  let result: AttendanceConfirmationResult | undefined;
  let db: ReturnType<typeof getDatabase> | undefined;
  let leases: PublicRateLimitLease[] = [];
  try {
    const context = await requestContext();
    db = context.db;
    const participant = context.loaded.state.participant;
    if (!participant) throw new Error("Participant unavailable.");
    const operation =
      participant.kind === "guest"
        ? PUBLIC_RATE_LIMIT_OPERATIONS.GUEST_CONFIRMATION
        : PUBLIC_RATE_LIMIT_OPERATIONS.REGULAR_CONFIRMATION;
    const identifier =
      participant.kind === "guest"
        ? `${participant.firstName}\u0000${participant.lastName}`
        : participant.studentId;
    const limit = await acquireLimits(context, [{ operation, identifier }]);
    leases = limit.leases;
    if (!limit.allowed) {
      destination = LIMITED_ERROR;
    } else {
      result = await confirmAttendance(context.db, context.signedContext, {
        attestationConfirmed: true,
        rememberDevice:
          participant.kind === "regular" &&
          text(formData, "remember") === "yes",
        request: context.metadata,
      });
      if (result.rememberedDevice?.token) {
        context.cookieStore.set(
          REMEMBERED_DEVICE_COOKIE_NAME,
          result.rememberedDevice.token,
          rememberedDeviceCookieOptions(),
        );
      }
      context.cookieStore.set(SIGN_IN_CONTEXT_COOKIE_NAME, "", {
        ...signInCookieOptions(0),
      });
      destination = confirmationDestination(result.status);
    }
  } catch {
    if (db) await recordFailures(db, leases);
  }
  redirect(destination);
}
