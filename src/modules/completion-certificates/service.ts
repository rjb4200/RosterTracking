import "server-only";

import { createHash } from "node:crypto";

import { PDFDocument, StandardFonts } from "pdf-lib";
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
  CERTIFICATE_EMAIL_TEMPLATE,
  CERTIFICATE_EMAIL_TEMPLATE_VERSION,
  renderCertificateEmail,
} from "@/modules/notifications/templates";
import { COMPLETION_CERTIFICATE_TEMPLATE } from "@/modules/official-roster-pdfs/mappings";
import type { OfficialRosterActor } from "@/modules/official-roster-pdfs/service";
import {
  type FinalizationSnapshot,
  formatDate,
  readSnapshot,
  renderPage,
} from "@/modules/official-roster-pdfs/service";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import { EMAIL_DELIVERY_STATUSES, emailDeliveries } from "@/server/db/schema";

type CertificateParticipant = FinalizationSnapshot["attendance"][number];

const COURSE_TYPE_LABELS: Record<string, string> = {
  continuing_education: "Continuing Education",
  initial_certification: "Initial Certification",
  refresher: "Refresher",
};

/** Human label for a stored course type; falls back to a title-cased value. */
export function courseTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return COURSE_TYPE_LABELS[value] ?? value.replaceAll("_", " ");
}

export function participantName(participant: CertificateParticipant): string {
  return [
    participant.firstName ?? participant.guestFirstName,
    participant.lastName ?? participant.guestLastName,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The class's scheduled hours, falling back to the participant's credit. */
export function certificateClassHours(snapshot: FinalizationSnapshot): string {
  const total = (snapshot.components ?? []).reduce(
    (sum, component) => sum + Number(component.creditedHours || 0),
    0,
  );
  if (total > 0) return String(total);
  return snapshot.attendance[0]?.creditedHours ?? "";
}

/** The signature line reads "<class type> – <course>". */
export function instructorTitleCourse(snapshot: FinalizationSnapshot): string {
  return [courseTypeLabel(snapshot.class.courseType), snapshot.class.courseName]
    .filter(Boolean)
    .join(" – ");
}

/** True when the finalized class reported to KBEMS. */
export function revisionReportsToKbems(
  snapshot: FinalizationSnapshot,
): boolean {
  return (snapshot.destinations ?? []).some(
    (destination) => destination.code === "kbems",
  );
}

/**
 * A digest of the values that make one participant's certificate distinct.
 * The template version and signature timestamp are deliberately excluded so an
 * unchanged certificate is not re-sent for a new revision number.
 */
export function certificateContentFingerprint(
  snapshot: FinalizationSnapshot,
  participant: CertificateParticipant,
): string {
  const lead =
    snapshot.instructors.find((instructor) => instructor.isLead) ??
    snapshot.instructors[0];
  const values = {
    participant: participantName(participant),
    courseName: snapshot.class.courseName,
    classHours: certificateClassHours(snapshot),
    courseType: snapshot.class.courseType ?? "",
    courseNumber: snapshot.class.courseNumber ?? "",
    completedAt: snapshot.class.completedAt ?? "",
    instructor: lead?.name ?? "",
  };
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

function setText(pdf: PDFDocument, name: string | undefined, value: string) {
  if (!name) throw new Error("Certificate template mapping is incomplete.");
  pdf
    .getForm()
    .getTextField(name)
    .setText(String(value ?? "").slice(0, 500));
}

function fillCertificate(
  pdf: PDFDocument,
  snapshot: FinalizationSnapshot,
  participant: CertificateParticipant,
) {
  const mapping = COMPLETION_CERTIFICATE_TEMPLATE;
  const lead =
    snapshot.instructors.find((instructor) => instructor.isLead) ??
    snapshot.instructors[0];
  setText(pdf, mapping.fields.studentName, participantName(participant));
  setText(pdf, mapping.fields.classHours, certificateClassHours(snapshot));
  setText(
    pdf,
    mapping.fields.courseType,
    courseTypeLabel(snapshot.class.courseType),
  );
  setText(pdf, mapping.fields.courseNumber, snapshot.class.courseNumber ?? "");
  setText(
    pdf,
    mapping.fields.completionDate,
    formatDate(snapshot.class.completedAt),
  );
  setText(pdf, mapping.fields.instructorName, lead?.name ?? "");
  setText(
    pdf,
    mapping.fields.instructorTitleCourse,
    instructorTitleCourse(snapshot),
  );
  // The lead instructor's typed-name electronic signature, taken from the
  // revision's attestation. Blank only when the revision has no attestation.
  setText(
    pdf,
    mapping.fields.instructorSignature,
    snapshot.signature?.name ?? "",
  );
}

function setCertificateMetadata(pdf: PDFDocument, title: string) {
  // Fixed metadata keeps equivalent finalized inputs byte-for-byte reproducible.
  pdf.setCreationDate(new Date(0));
  pdf.setModificationDate(new Date(0));
  pdf.setCreator("Roster Command");
  pdf.setProducer("Roster Command");
  pdf.setTitle(title);
}

/** One certificate page (unflattened when `flatten` is false) for a participant. */
export async function renderCertificatePage(
  snapshot: FinalizationSnapshot,
  participant: CertificateParticipant,
  options: { flatten?: boolean } = {},
): Promise<PDFDocument> {
  const mapping = COMPLETION_CERTIFICATE_TEMPLATE;
  return renderPage(
    mapping,
    (pdf) => fillCertificate(pdf, snapshot, participant),
    { flatten: options.flatten ?? true },
  );
}

/** One certificate page for a single participant. */
export async function renderCertificateForParticipant(
  snapshot: FinalizationSnapshot,
  participant: CertificateParticipant,
): Promise<Uint8Array> {
  const mapping = COMPLETION_CERTIFICATE_TEMPLATE;
  const page = await renderCertificatePage(snapshot, participant);
  setCertificateMetadata(page, mapping.formType);
  return page.save({ useObjectStreams: false });
}

/** One certificate page per active participant of the revision. */
export async function renderCompletionCertificates(
  snapshot: FinalizationSnapshot,
): Promise<Uint8Array> {
  const mapping = COMPLETION_CERTIFICATE_TEMPLATE;
  const output = await PDFDocument.create();
  for (const participant of snapshot.attendance) {
    const page = await renderPage(mapping, (pdf) =>
      fillCertificate(pdf, snapshot, participant),
    );
    const copied = await output.copyPages(page, [0]);
    output.addPage(copied[0]);
  }
  setCertificateMetadata(output, mapping.formType);
  return output.save({ useObjectStreams: false });
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * A generated student-list cover page. Not a state form, so it needs no
 * approved template or checksum; it indexes the certificates behind it.
 */
async function renderStudentListCover(
  snapshot: FinalizationSnapshot,
): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([792, 612]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  let y = height - 56;
  page.drawText("Completion Certificates", { x: 56, y, size: 20, font: bold });
  y -= 28;
  page.drawText(truncate(snapshot.class.courseName, 80), {
    x: 56,
    y,
    size: 14,
    font,
  });
  y -= 18;
  const meta = [
    formatDate(snapshot.class.completedAt),
    `${snapshot.attendance.length} participants`,
  ]
    .filter(Boolean)
    .join("  -  ");
  page.drawText(meta, { x: 56, y, size: 11, font });
  y -= 30;
  page.drawText("Participant", { x: 56, y, size: 11, font: bold });
  page.drawText("Agency", { x: 360, y, size: 11, font: bold });
  page.drawText("Hours", { x: 700, y, size: 11, font: bold });
  y -= 8;
  page.drawLine({
    start: { x: 56, y },
    end: { x: width - 56, y },
    thickness: 0.5,
  });
  y -= 20;
  for (const participant of snapshot.attendance) {
    if (y < 56) break;
    page.drawText(truncate(participantName(participant), 48), {
      x: 56,
      y,
      size: 11,
      font,
    });
    page.drawText(truncate(participant.agencyName, 48), {
      x: 360,
      y,
      size: 11,
      font,
    });
    page.drawText(participant.creditedHours ?? "", {
      x: 700,
      y,
      size: 11,
      font,
    });
    y -= 18;
  }
  return pdf;
}

/**
 * The admin batch: a student-list cover page followed by one certificate page
 * per active participant, in one PDF.
 */
export async function renderCompletionCertificateBatch(
  snapshot: FinalizationSnapshot,
): Promise<Uint8Array> {
  const mapping = COMPLETION_CERTIFICATE_TEMPLATE;
  const output = await PDFDocument.create();
  const cover = await renderStudentListCover(snapshot);
  for (const page of await output.copyPages(cover, cover.getPageIndices())) {
    output.addPage(page);
  }
  for (const participant of snapshot.attendance) {
    const page = await renderPage(mapping, (pdf) =>
      fillCertificate(pdf, snapshot, participant),
    );
    const copied = await output.copyPages(page, [0]);
    output.addPage(copied[0]);
  }
  setCertificateMetadata(output, `${mapping.formType}-batch`);
  return output.save({ useObjectStreams: false });
}

export interface GeneratedCertificates {
  bytes: Uint8Array;
  filename: string;
  participantCount: number;
}

function certificateFilename(): string {
  return `${COMPLETION_CERTIFICATE_TEMPLATE.templateVersion}.pdf`;
}

/**
 * Generates the certificate batch for a finalized revision on demand. Access
 * follows the official-roster rule (assigned instructor, Training Major, or
 * Administrator); generated bytes are never retained, and the signing source is
 * audited.
 */
export async function generateCompletionCertificates(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
): Promise<GeneratedCertificates> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const bytes = await renderCompletionCertificateBatch(snapshot);
  const participantCount = snapshot.attendance.length;
  const signed = Boolean(snapshot.signature?.name);
  await db.transaction(async (transaction) => {
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "completion_certificate.generated",
      entityType: "finalization_revision",
      entityId: revisionId,
      details: {
        participantCount,
        signed,
        signer: signed ? snapshot.signature?.name : null,
      },
    });
  });
  return {
    bytes,
    filename: certificateFilename(),
    participantCount,
  };
}

export interface CertificateQueueResult {
  total: number;
  queued: number;
  skipped: number;
  undeliverable: number;
}

/**
 * Writes one delivery row per active participant of an EMS class inside the
 * finalizing transaction. A participant without a deliverable email is skipped
 * and surfaced later as a delivery exception; an unchanged certificate is
 * recorded as skipped so it is not re-sent.
 */
export async function queueCertificateDeliveries(
  transaction: DatabaseTransaction,
  revisionId: string,
  snapshot: FinalizationSnapshot,
): Promise<CertificateQueueResult> {
  const result: CertificateQueueResult = {
    total: 0,
    queued: 0,
    skipped: 0,
    undeliverable: 0,
  };
  for (const participant of snapshot.attendance) {
    result.total += 1;
    const candidate = participant.email?.trim() ?? "";
    let recipient: string;
    try {
      recipient = candidate ? validateEmailRecipient(candidate) : "";
    } catch {
      recipient = "";
    }
    if (!recipient) {
      result.undeliverable += 1;
      continue;
    }
    const fingerprint = certificateContentFingerprint(snapshot, participant);
    const lastSent = await findLastSentFingerprint(
      transaction,
      participant.attendanceId,
      CERTIFICATE_EMAIL_TEMPLATE,
    );
    const unchanged = lastSent === fingerprint;
    await enqueueEmail(transaction, {
      template: CERTIFICATE_EMAIL_TEMPLATE,
      templateVersion: CERTIFICATE_EMAIL_TEMPLATE_VERSION,
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

function certificateMessage(
  snapshot: FinalizationSnapshot,
  participant: CertificateParticipant,
  recipient: string,
  bytes: Uint8Array,
) {
  const rendered = renderCertificateEmail({
    participantName: participantName(participant),
    courseName: snapshot.class.courseName,
    completedAt: formatDate(snapshot.class.completedAt) || null,
    classHours: certificateClassHours(snapshot),
  });
  return {
    recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    attachments: [{ filename: certificateFilename(), bytes }],
  };
}

/**
 * Sends the queued (and previously failed) certificate deliveries for a
 * revision after its transaction has committed. Failures are recorded and
 * retryable; this never throws into the caller.
 */
export async function dispatchCertificateDeliveries(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
): Promise<void> {
  const deliveries = await listQueuedDeliveries(
    db,
    EMAIL_REFERENCE_TYPES.FINALIZATION_REVISION,
    revisionId,
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
    const bytes = await renderCertificateForParticipant(snapshot, participant);
    return certificateMessage(snapshot, participant, delivery.recipient, bytes);
  });
}

export interface CertificateResendResult {
  recipient: string;
  state: "delivered" | "failed";
}

/**
 * Resends one participant's certificate, optionally to a different address,
 * without changing the stored participant profile. Access follows the
 * official-roster rule.
 */
export async function resendParticipantCertificate(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
  attendanceId: string,
  recipientInput: string,
): Promise<CertificateResendResult> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const participant = snapshot.attendance.find(
    (entry) => entry.attendanceId === attendanceId,
  );
  if (!participant) throw new Error("Participant not found on this revision.");
  const supplied = recipientInput.trim();
  const recipient = supplied
    ? validateEmailRecipient(supplied)
    : validateEmailRecipient(participant.email ?? "");
  const bytes = await renderCertificateForParticipant(snapshot, participant);
  const fingerprint = certificateContentFingerprint(snapshot, participant);

  let delivery = await findDeliveryForParticipant(
    db,
    revisionId,
    attendanceId,
    CERTIFICATE_EMAIL_TEMPLATE,
  );
  if (!delivery) {
    const [inserted] = await db
      .insert(emailDeliveries)
      .values({
        template: CERTIFICATE_EMAIL_TEMPLATE,
        templateVersion: CERTIFICATE_EMAIL_TEMPLATE_VERSION,
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
        CERTIFICATE_EMAIL_TEMPLATE,
      ));
  }
  if (!delivery) throw new Error("Certificate delivery could not be recorded.");
  if (delivery.recipient !== recipient) {
    await updateDeliveryRecipient(db, delivery.id, recipient);
  }

  let state: CertificateResendResult["state"] = "failed";
  try {
    const result = await sendEmail(
      certificateMessage(snapshot, participant, recipient, bytes),
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
      action: "completion_certificate.resent",
      entityType: "finalization_revision",
      entityId: revisionId,
      details: { attendanceId, recipient, state },
    });
  });
  return { recipient, state };
}

export type CertificateDeliveryState =
  | "delivered"
  | "queued"
  | "failed"
  | "skipped"
  | "undeliverable";

export interface CertificateDeliveryParticipant {
  attendanceId: string;
  name: string;
  email: string | null;
  state: CertificateDeliveryState;
}

/**
 * Per-participant certificate delivery state for the review screen, derived
 * from the recorded deliveries plus the revision's participant list.
 */
export async function getCertificateDeliveryOverview(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
): Promise<CertificateDeliveryParticipant[]> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const deliveries = await listDeliveriesForReference(
    db,
    EMAIL_REFERENCE_TYPES.FINALIZATION_REVISION,
    revisionId,
  );
  const byAttendance = new Map(
    deliveries
      .filter((delivery) => delivery.attendanceId)
      .map((delivery) => [delivery.attendanceId as string, delivery]),
  );
  return snapshot.attendance.map((participant) => {
    const email = participant.email?.trim() || null;
    const delivery = byAttendance.get(participant.attendanceId);
    let state: CertificateDeliveryState;
    if (!email) state = "undeliverable";
    else if (!delivery) state = "queued";
    else if (delivery.status === "sent") state = "delivered";
    else if (delivery.status === "skipped") state = "skipped";
    else if (delivery.status === "failed") state = "failed";
    else state = "queued";
    return {
      attendanceId: participant.attendanceId,
      name: participantName(participant),
      email,
      state,
    };
  });
}
