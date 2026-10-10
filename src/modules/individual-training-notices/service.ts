import "server-only";

import { createHash } from "node:crypto";

import { PDFDocument } from "pdf-lib";
import { loadLogoAttachment } from "@/modules/notifications/assets";
import {
  EMAIL_SENDER,
  sendEmail,
  validateEmailRecipient,
} from "@/modules/notifications/client";
import {
  dispatchDeliveries,
  EMAIL_REFERENCE_TYPES,
  enqueueEmail,
  findDeliveryForParticipant,
  findLastSentFingerprint,
  listDeliveriesForReference,
  listQueuedDeliveries,
  markDeliveryFailed,
  markDeliverySent,
  updateDeliveryRecipient,
} from "@/modules/notifications/service";
import {
  renderTrainingNoticeEmail,
  TRAINING_NOTICE_EMAIL_TEMPLATE,
  TRAINING_NOTICE_EMAIL_TEMPLATE_VERSION,
} from "@/modules/notifications/templates";
import {
  getTemplateMapping,
  KFS_1B_TEMPLATES,
  type Kfs1bVariant,
} from "@/modules/official-roster-pdfs/mappings";
import type { OfficialRosterActor } from "@/modules/official-roster-pdfs/service";
import {
  type FinalizationSnapshot,
  formatDate,
  formatTime,
  readSnapshot,
  renderOfficialRoster,
  renderPage,
  snapshotIdentifier,
} from "@/modules/official-roster-pdfs/service";
import { isAttendanceFireEligible } from "@/modules/reference/fire-eligibility";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import { EMAIL_DELIVERY_STATUSES, emailDeliveries } from "@/server/db/schema";

type NoticeParticipant = FinalizationSnapshot["attendance"][number];

const ROW_LIMIT = 5;

function participantName(participant: NoticeParticipant): string {
  return [
    participant.firstName ?? participant.guestFirstName,
    participant.lastName ?? participant.guestLastName,
  ]
    .filter(Boolean)
    .join(" ");
}

/** A class that reports to the Fire Commission. */
export function isFireClass(snapshot: FinalizationSnapshot): boolean {
  return (snapshot.destinations ?? []).some(
    (destination) => destination.code === "fire",
  );
}

/** Active participants who represent an agency other than the class host agency. */
export function qualifyingParticipants(
  snapshot: FinalizationSnapshot,
): NoticeParticipant[] {
  const hostAgencyId = snapshot.class.hostAgencyId ?? null;
  if (!isFireClass(snapshot) || !hostAgencyId) return [];
  return snapshot.attendance.filter(
    (participant) =>
      participant.agencyId &&
      participant.agencyId !== hostAgencyId &&
      isAttendanceFireEligible(snapshot, participant.attendanceId),
  );
}

function noticeTotalHours(snapshot: FinalizationSnapshot): string {
  const total = (snapshot.components ?? []).reduce(
    (sum, component) => sum + Number(component.creditedHours || 0),
    0,
  );
  if (total > 0) return String(total);
  return snapshot.attendance[0]?.creditedHours ?? "";
}

/**
 * Renders one participant's individual training notice page in the requested
 * variant (Light-Yellow for the department, White for the participant).
 * Unflattened when `flatten` is false, so tests can inspect the fields.
 */
export async function renderTrainingNoticePage(
  variant: Kfs1bVariant,
  snapshot: FinalizationSnapshot,
  participant: NoticeParticipant,
  options: { flatten?: boolean } = {},
): Promise<PDFDocument> {
  const mapping = KFS_1B_TEMPLATES[variant];
  const lead =
    snapshot.instructors.find((instructor) => instructor.isLead) ??
    snapshot.instructors[0];
  const subjects = (snapshot.components ?? []).slice(0, ROW_LIMIT);
  return renderPage(
    mapping,
    (pdf) => {
      const form = pdf.getForm();
      // Align the affected fields to their printed cells before filling.
      for (const [fieldName, rect] of Object.entries(
        mapping.fieldCoordinates,
      )) {
        form
          .getTextField(fieldName)
          .acroField.getWidgets()[0]
          ?.setRectangle(rect);
      }
      const set = (name: string | undefined, value: string) => {
        if (!name) return;
        form.getTextField(name).setText(String(value ?? "").slice(0, 500));
      };
      set(mapping.fields.studentName, participantName(participant));
      set(
        mapping.fields.studentFfn,
        snapshotIdentifier(snapshot, participant.attendanceId),
      );
      set(mapping.fields.instructorName, lead?.name ?? "");
      set(mapping.fields.instructorFfn, lead?.ffn ?? "");
      set(mapping.fields.date, formatDate(snapshot.class.completedAt));
      set(mapping.fields.startTime, formatTime(subjects[0]?.startsAt));
      set(mapping.fields.location, snapshot.class.siteName ?? "");
      set(mapping.fields.totalHours, noticeTotalHours(snapshot));
      set(mapping.fields.instructorSignature, snapshot.signature?.name ?? "");
      subjects.forEach((subject, index) => {
        set(`Row_${index + 1}_Category_Code`, subject.category ?? "");
        set(`Row_${index + 1}_Hours`, subject.creditedHours);
      });
      // Agency_Selection is intentionally left blank pending confirmation.
    },
    { flatten: options.flatten ?? true },
  );
}

/** Renders one participant's individual training notice as PDF bytes. */
export async function renderTrainingNotice(
  variant: Kfs1bVariant,
  snapshot: FinalizationSnapshot,
  participant: NoticeParticipant,
): Promise<Uint8Array> {
  const mapping = KFS_1B_TEMPLATES[variant];
  const doc = await renderTrainingNoticePage(variant, snapshot, participant);
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));
  doc.setCreator("Roster Command");
  doc.setProducer("Roster Command");
  doc.setTitle(mapping.templateVersion);
  return doc.save({ useObjectStreams: false });
}

export interface FireRosterDocument {
  bytes: Uint8Array;
  filename: string;
}

/**
 * The Fire roster output: the KFS-1A pages followed by one Light-Yellow
 * individual training notice page per qualifying participant.
 */
export async function generateFireRosterWithNotices(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
): Promise<FireRosterDocument> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const mapping = getTemplateMapping("kfs-1a");
  const filename = `kfs-1a-${mapping.templateVersion}.pdf`;
  const rosterBytes = await renderOfficialRoster("kfs-1a", snapshot);
  const qualifying = qualifyingParticipants(snapshot);
  if (!qualifying.length) return { bytes: rosterBytes, filename };

  const output = await PDFDocument.create();
  const roster = await PDFDocument.load(rosterBytes);
  for (const page of await output.copyPages(roster, roster.getPageIndices())) {
    output.addPage(page);
  }
  for (const participant of qualifying) {
    const noticeBytes = await renderTrainingNotice(
      "lightYellow",
      snapshot,
      participant,
    );
    const notice = await PDFDocument.load(noticeBytes);
    for (const page of await output.copyPages(
      notice,
      notice.getPageIndices(),
    )) {
      output.addPage(page);
    }
  }
  output.setCreationDate(new Date(0));
  output.setModificationDate(new Date(0));
  output.setCreator("Roster Command");
  output.setProducer("Roster Command");
  output.setTitle("kfs-1a official roster");
  return { bytes: await output.save({ useObjectStreams: false }), filename };
}

/** A digest of the meaningful values of one participant's notice. */
export function trainingNoticeContentFingerprint(
  snapshot: FinalizationSnapshot,
  participant: NoticeParticipant,
): string {
  const lead =
    snapshot.instructors.find((instructor) => instructor.isLead) ??
    snapshot.instructors[0];
  const values = {
    participant: participantName(participant),
    courseName: snapshot.class.courseName,
    completedAt: snapshot.class.completedAt ?? "",
    totalHours: noticeTotalHours(snapshot),
    instructor: lead?.name ?? "",
    agency: participant.agencyName ?? "",
    subjects: (snapshot.components ?? [])
      .map((subject) => `${subject.category ?? ""}:${subject.creditedHours}`)
      .join("|"),
  };
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

export interface NoticeQueueResult {
  total: number;
  queued: number;
  skipped: number;
  undeliverable: number;
}

/**
 * Queues one White notice delivery per qualifying participant inside the
 * finalizing transaction. An unchanged notice is recorded as skipped so it is
 * not re-sent; a participant without an email is surfaced as an exception.
 */
export async function queueTrainingNoticeDeliveries(
  transaction: DatabaseTransaction,
  revisionId: string,
  snapshot: FinalizationSnapshot,
): Promise<NoticeQueueResult> {
  const qualifying = qualifyingParticipants(snapshot);
  const result: NoticeQueueResult = {
    total: qualifying.length,
    queued: 0,
    skipped: 0,
    undeliverable: 0,
  };
  for (const participant of qualifying) {
    const candidate = participant.email?.trim() ?? "";
    let recipient = "";
    try {
      recipient = candidate ? validateEmailRecipient(candidate) : "";
    } catch {
      recipient = "";
    }
    if (!recipient) {
      result.undeliverable += 1;
      continue;
    }
    const fingerprint = trainingNoticeContentFingerprint(snapshot, participant);
    const lastSent = await findLastSentFingerprint(
      transaction,
      participant.attendanceId,
      TRAINING_NOTICE_EMAIL_TEMPLATE,
    );
    const unchanged = lastSent === fingerprint;
    await enqueueEmail(transaction, {
      template: TRAINING_NOTICE_EMAIL_TEMPLATE,
      templateVersion: TRAINING_NOTICE_EMAIL_TEMPLATE_VERSION,
      referenceType: EMAIL_REFERENCE_TYPES.FINALIZATION_REVISION,
      referenceId: revisionId,
      attendanceId: participant.attendanceId,
      recipient,
      contentFingerprint: fingerprint,
      status: unchanged
        ? EMAIL_DELIVERY_STATUSES.SKIPPED
        : EMAIL_DELIVERY_STATUSES.QUEUED,
    });
    if (unchanged) result.skipped += 1;
    else result.queued += 1;
  }
  return result;
}

async function trainingNoticeMessage(
  snapshot: FinalizationSnapshot,
  participant: NoticeParticipant,
  recipient: string,
  bytes: Uint8Array,
  filename: string,
) {
  const rendered = renderTrainingNoticeEmail({
    participantName: participantName(participant),
    courseName: snapshot.class.courseName,
    completedAt: formatDate(snapshot.class.completedAt) || null,
    totalHours: noticeTotalHours(snapshot),
    agencyName: participant.agencyName || null,
  });
  const logo = await loadLogoAttachment();
  return {
    recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    attachments: [logo, { filename, bytes }],
  };
}

/**
 * Sends the queued (and previously failed) White notice deliveries for a
 * revision after its transaction has committed. Failures are recorded and
 * retryable; this never throws into the caller.
 */
export async function dispatchTrainingNoticeDeliveries(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
): Promise<void> {
  const deliveries = await listQueuedDeliveries(
    db,
    EMAIL_REFERENCE_TYPES.FINALIZATION_REVISION,
    revisionId,
    TRAINING_NOTICE_EMAIL_TEMPLATE,
  );
  if (!deliveries.length) return;
  let snapshot: FinalizationSnapshot;
  try {
    snapshot = await readSnapshot(db, actor, revisionId);
  } catch {
    return;
  }
  await dispatchDeliveries(db, deliveries, async (delivery) => {
    const participant = snapshot.attendance.find(
      (entry) => entry.attendanceId === delivery.attendanceId,
    );
    if (!participant) return null;
    const bytes = await renderTrainingNotice("white", snapshot, participant);
    return trainingNoticeMessage(
      snapshot,
      participant,
      delivery.recipient,
      bytes,
      `${KFS_1B_TEMPLATES.white.templateVersion}.pdf`,
    );
  });
}

export interface NoticeResendResult {
  recipient: string;
  state: "delivered" | "failed";
}

/**
 * Resends one participant's White notice, optionally to a different address,
 * without changing the stored participant profile.
 */
export async function resendParticipantNotice(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
  attendanceId: string,
  recipientInput: string,
): Promise<NoticeResendResult> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const participant = snapshot.attendance.find(
    (entry) => entry.attendanceId === attendanceId,
  );
  if (!participant) throw new Error("Participant not found on this revision.");
  const supplied = recipientInput.trim();
  const recipient = supplied
    ? validateEmailRecipient(supplied)
    : validateEmailRecipient(participant.email ?? "");
  const bytes = await renderTrainingNotice("white", snapshot, participant);
  const fingerprint = trainingNoticeContentFingerprint(snapshot, participant);

  let delivery = await findDeliveryForParticipant(
    db,
    revisionId,
    attendanceId,
    TRAINING_NOTICE_EMAIL_TEMPLATE,
  );
  if (!delivery) {
    const [inserted] = await db
      .insert(emailDeliveries)
      .values({
        template: TRAINING_NOTICE_EMAIL_TEMPLATE,
        templateVersion: TRAINING_NOTICE_EMAIL_TEMPLATE_VERSION,
        referenceType: EMAIL_REFERENCE_TYPES.FINALIZATION_REVISION,
        referenceId: revisionId,
        attendanceId,
        recipient,
        sender: EMAIL_SENDER,
        status: EMAIL_DELIVERY_STATUSES.QUEUED,
        contentFingerprint: fingerprint,
      })
      .onConflictDoNothing()
      .returning();
    delivery =
      inserted ??
      (await findDeliveryForParticipant(
        db,
        revisionId,
        attendanceId,
        TRAINING_NOTICE_EMAIL_TEMPLATE,
      ));
  }
  if (!delivery) throw new Error("Notice delivery could not be recorded.");
  if (delivery.recipient !== recipient) {
    await updateDeliveryRecipient(db, delivery.id, recipient);
  }

  let state: NoticeResendResult["state"] = "failed";
  try {
    const result = await sendEmail(
      await trainingNoticeMessage(
        snapshot,
        participant,
        recipient,
        bytes,
        `${KFS_1B_TEMPLATES.white.templateVersion}.pdf`,
      ),
    );
    await markDeliverySent(db, delivery.id, result.providerMessageId);
    state = "delivered";
  } catch {
    await markDeliveryFailed(db, delivery.id, "Resend failed.");
    state = "failed";
  }

  await db.transaction(async (transaction) => {
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "individual_training_notice.resent",
      entityType: "finalization_revision",
      entityId: revisionId,
      details: { attendanceId, recipient, state },
    });
  });
  return { recipient, state };
}

/** The variant an operator chooses for an on-demand notice. */
export type NoticeVariant = "yellow" | "white";

function kfsVariant(variant: NoticeVariant): Kfs1bVariant {
  return variant === "yellow" ? "lightYellow" : "white";
}

function variantFilename(variant: NoticeVariant): string {
  return `${KFS_1B_TEMPLATES[kfsVariant(variant)].templateVersion}.pdf`;
}

export interface RenderedNotice {
  bytes: Uint8Array;
  filename: string;
}

/**
 * Renders one participant's notice in the chosen variant for a finalized
 * revision. Un-gated by host-agency eligibility so any participant qualifies.
 */
export async function renderParticipantNotice(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
  attendanceId: string,
  variant: NoticeVariant,
): Promise<RenderedNotice> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const participant = snapshot.attendance.find(
    (entry) => entry.attendanceId === attendanceId,
  );
  if (!participant) throw new Error("Participant not found on this revision.");
  const bytes = await renderTrainingNotice(
    kfsVariant(variant),
    snapshot,
    participant,
  );
  return { bytes, filename: variantFilename(variant) };
}

/**
 * Emails one participant's notice on demand, in the chosen variant, to an
 * optional operator-entered address. Updates the participant's delivery record
 * and audits the send.
 */
export async function sendParticipantNoticeOnDemand(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
  attendanceId: string,
  variant: NoticeVariant,
  recipientInput: string,
): Promise<NoticeResendResult> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const participant = snapshot.attendance.find(
    (entry) => entry.attendanceId === attendanceId,
  );
  if (!participant) throw new Error("Participant not found on this revision.");
  const supplied = recipientInput.trim();
  const recipient = supplied
    ? validateEmailRecipient(supplied)
    : validateEmailRecipient(participant.email ?? "");
  const bytes = await renderTrainingNotice(
    kfsVariant(variant),
    snapshot,
    participant,
  );
  const fingerprint = trainingNoticeContentFingerprint(snapshot, participant);

  let delivery = await findDeliveryForParticipant(
    db,
    revisionId,
    attendanceId,
    TRAINING_NOTICE_EMAIL_TEMPLATE,
  );
  if (!delivery) {
    const [inserted] = await db
      .insert(emailDeliveries)
      .values({
        template: TRAINING_NOTICE_EMAIL_TEMPLATE,
        templateVersion: TRAINING_NOTICE_EMAIL_TEMPLATE_VERSION,
        referenceType: EMAIL_REFERENCE_TYPES.FINALIZATION_REVISION,
        referenceId: revisionId,
        attendanceId,
        recipient,
        sender: EMAIL_SENDER,
        status: EMAIL_DELIVERY_STATUSES.QUEUED,
        contentFingerprint: fingerprint,
      })
      .onConflictDoNothing()
      .returning();
    delivery =
      inserted ??
      (await findDeliveryForParticipant(
        db,
        revisionId,
        attendanceId,
        TRAINING_NOTICE_EMAIL_TEMPLATE,
      ));
  }
  if (!delivery) throw new Error("Notice delivery could not be recorded.");
  if (delivery.recipient !== recipient) {
    await updateDeliveryRecipient(db, delivery.id, recipient);
  }

  let state: NoticeResendResult["state"] = "failed";
  try {
    const result = await sendEmail(
      await trainingNoticeMessage(
        snapshot,
        participant,
        recipient,
        bytes,
        variantFilename(variant),
      ),
    );
    await markDeliverySent(db, delivery.id, result.providerMessageId);
    state = "delivered";
  } catch {
    await markDeliveryFailed(db, delivery.id, "Send failed.");
    state = "failed";
  }

  await db.transaction(async (transaction) => {
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "individual_training_notice.emailed",
      entityType: "finalization_revision",
      entityId: revisionId,
      details: { attendanceId, variant, recipient, state },
    });
  });
  return { recipient, state };
}

export type NoticeDeliveryState =
  | "delivered"
  | "queued"
  | "failed"
  | "skipped"
  | "undeliverable"
  | "not_sent";

export interface NoticeDeliveryParticipant {
  attendanceId: string;
  name: string;
  agencyName: string;
  email: string | null;
  state: NoticeDeliveryState;
}

/** Per-participant notice delivery state for the review screen. */
export async function getTrainingNoticeDeliveryOverview(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
): Promise<NoticeDeliveryParticipant[]> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const qualifying = new Set(
    qualifyingParticipants(snapshot).map((p) => p.attendanceId),
  );
  const deliveries = await listDeliveriesForReference(
    db,
    EMAIL_REFERENCE_TYPES.FINALIZATION_REVISION,
    revisionId,
  );
  const byAttendance = new Map(
    deliveries
      .filter(
        (delivery) => delivery.template === TRAINING_NOTICE_EMAIL_TEMPLATE,
      )
      .filter((delivery) => delivery.attendanceId)
      .map((delivery) => [delivery.attendanceId as string, delivery]),
  );
  return snapshot.attendance.map((participant) => {
    const email = participant.email?.trim() || null;
    const delivery = byAttendance.get(participant.attendanceId);
    let state: NoticeDeliveryState;
    if (delivery) {
      if (delivery.status === "sent") state = "delivered";
      else if (delivery.status === "skipped") state = "skipped";
      else if (delivery.status === "failed") state = "failed";
      else state = "queued";
    } else if (qualifying.has(participant.attendanceId)) {
      state = email ? "queued" : "undeliverable";
    } else {
      state = "not_sent";
    }
    return {
      attendanceId: participant.attendanceId,
      name: participantName(participant),
      agencyName: participant.agencyName,
      email,
      state,
    };
  });
}
