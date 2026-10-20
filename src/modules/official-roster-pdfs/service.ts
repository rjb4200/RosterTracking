import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { and, eq, inArray } from "drizzle-orm";
import {
  PDFDocument,
  type PDFFont,
  PDFName,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import { z } from "zod";

import { resolveFireSigner } from "@/modules/classes/fire-signer";
import {
  composeCurriculumLabel,
  parseComponentMethod,
} from "@/modules/classes/fire-subjects";
import { loadLogoAttachment } from "@/modules/notifications/assets";
import { sendEmail } from "@/modules/notifications/client";
import { BRAND, emailShell, FONT_STACK } from "@/modules/notifications/layout";
import { decryptCredential } from "@/modules/reference/crypto";
import { fireEligibleAttendance } from "@/modules/reference/fire-eligibility";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";
import { writeAuditLog } from "@/server/db/audit";
import type { Database } from "@/server/db/client";
import {
  classInstructors,
  finalizationFireAttestations,
  finalizationRevisions,
  revisionAttestations,
  roles,
  userRoles,
} from "@/server/db/schema";

import { attendeeInitials } from "./initials";
import {
  getTemplateMapping,
  type OfficialRosterForm,
  type TemplateMapping,
} from "./mappings";

export interface OfficialRosterActor {
  id: string;
  username: string;
}

export interface SnapshotAttendance {
  attendanceId: string;
  agencyName: string;
  // The represented agency identity, used to decide training-notice eligibility.
  agencyId?: string | null;
  creditedHours: string;
  firstName: string | null;
  lastName: string | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  // Recipient email captured at finalization for certificate delivery. Null
  // when the participant has no deliverable address (a legacy student or a
  // guest recorded before guest email was required).
  email?: string | null;
  // Frozen at finalization: the attendee had a valid FFN. Absent on revisions
  // that predate this fact, where it is derived from the credential snapshots.
  fireEligible?: boolean;
}

export interface FinalizationSnapshot {
  class: {
    courseName: string;
    siteName: string | null;
    // The class host agency, used to decide which participants are outside it.
    hostAgencyId?: string | null;
    hostAgencyName?: string | null;
    // Course description or objectives captured for the KBEMS-E16 roster.
    objectives?: string | null;
    // EMS course details printed on the completion certificate.
    courseType?: string | null;
    courseNumber?: string | null;
    completedAt: string | null;
  };
  // Reporting destinations selected for the class at finalization.
  destinations?: Array<{ code: string; name: string }>;
  // The lead instructor's electronic attestation captured at finalization.
  // Optional because revisions finalized before signing have none.
  signature?: {
    name: string;
    signedAt: string | null;
    attestationVersion: string | null;
  };
  // The fire instructor's attestation on the Fire roster and training notice.
  // Present at finalization when the lead is the Fire signer, otherwise after
  // the Fire signer signs the locked revision.
  fireSignature?: {
    name: string;
    signedAt: string | null;
    attestationVersion: string | null;
    signedByUserId?: string | null;
  };
  // Set on revisions created after the Fire signer model. A legacy revision
  // leaves this null and keeps the single-signature fallback.
  fireSignerUserId?: string | null;
  // Whether the revision has a stored scope-keyed attestation. A legacy
  // revision has neither and keeps the single-signature fallback.
  rosterAttested?: boolean;
  fireAttested?: boolean;
  // True when the revision predates scope-keyed attestations. A legacy
  // revision keeps the blank-signature fallback.
  legacy?: boolean;
  // Legacy field. MTU usage is operational and is no longer written into the
  // signed snapshot; it is kept optional so revisions that predate this still
  // decode.
  mtuUsage?: {
    equipmentUsed: string | null;
    mileage: string | null;
    usedSupplies: string | null;
  } | null;
  instructors: Array<{
    userId: string;
    name: string;
    isLead: boolean;
    ffn?: string | null;
    level?: number | null;
  }>;
  attendance: SnapshotAttendance[];
  fieldSnapshots: Array<{
    attendanceId: string;
    studentField: string;
    encryptedValue: string;
  }>;
  credentialSnapshots: Array<{
    attendanceId: string;
    credentialTypeCode?: string;
    encryptedValue: string;
  }>;
  // This is intentionally optional because older immutable revisions predate
  // components in their encrypted finalization snapshot.
  components?: Array<{
    title: string | null;
    category?: string | null;
    className?: string | null;
    curriculumPublisher?: string | null;
    curriculumProgramTitle?: string | null;
    curriculumVersion?: string | null;
    // Optional because older revisions predate the typed-book and chapter fields.
    curriculumName?: string | null;
    curriculumChapter?: string | null;
    lessonPlan?: string | null;
    method?: string | null;
    startsAt: string;
    endsAt: string;
    creditedHours: string;
  }>;
}

export function formatDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.DEPARTMENT_TIME_ZONE ?? "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: string | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.DEPARTMENT_TIME_ZONE ?? "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function split<T>(values: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

function attendeeName(attendee: SnapshotAttendance): string {
  return [
    attendee.firstName ?? attendee.guestFirstName,
    attendee.lastName ?? attendee.guestLastName,
  ]
    .filter(Boolean)
    .join(" ");
}

export function snapshotIdentifier(
  snapshot: FinalizationSnapshot,
  attendanceId: string,
): string {
  const field = snapshot.fieldSnapshots.find(
    (value) =>
      value.attendanceId === attendanceId &&
      ["ffn", "studentNumber"].includes(value.studentField),
  );
  const credential = snapshot.credentialSnapshots.find(
    (value) =>
      value.attendanceId === attendanceId && value.credentialTypeCode === "ffn",
  );
  const legacyCredentials = snapshot.credentialSnapshots.filter(
    (value) =>
      value.attendanceId === attendanceId &&
      value.credentialTypeCode === undefined,
  );
  // Older snapshots did not retain a credential type. A lone credential is
  // unambiguous; otherwise leave the form blank rather than use the wrong ID.
  const value =
    field ??
    credential ??
    (legacyCredentials.length === 1 ? legacyCredentials[0] : undefined);
  return value ? decryptCredential(value.encryptedValue) : "";
}

export function hasOfficialRosterAuthority(
  roleCodes: readonly string[],
): boolean {
  return roleCodes.some(
    (role) =>
      role === ROLE_CODES.ADMINISTRATOR || role === ROLE_CODES.TRAINING_MAJOR,
  );
}

async function assertRosterAuthority(
  db: Database,
  actor: OfficialRosterActor,
  classId: string,
) {
  const rows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(userRoles.userId, actor.id),
        eq(roles.isActive, true),
        inArray(roles.code, [
          ROLE_CODES.ADMINISTRATOR,
          ROLE_CODES.TRAINING_MAJOR,
        ]),
      ),
    )
    .limit(1);
  if (hasOfficialRosterAuthority(rows.map((row) => row.code))) return;

  const assigned = await db
    .select({ classId: classInstructors.classId })
    .from(classInstructors)
    .where(
      and(
        eq(classInstructors.classId, classId),
        eq(classInstructors.userId, actor.id),
      ),
    )
    .limit(1);
  if (!assigned.length) throw new Error("Official roster access denied.");
}

/**
 * Thrown when a finalized revision's encrypted snapshot cannot be decrypted or
 * parsed. This is a controlled, user-visible condition: an unreadable revision
 * (for example fixture data written without a valid payload) must surface as a
 * clear message rather than an unhandled failure.
 */
export class UnreadableRevisionSnapshotError extends Error {
  constructor() {
    super(
      "This finalized revision's snapshot cannot be read, so no official roster can be generated. The revision may have been written with a different credential key.",
    );
    this.name = "UnreadableRevisionSnapshotError";
  }
}

export async function readSnapshot(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
): Promise<FinalizationSnapshot> {
  const [revision] = await db
    .select({
      classId: finalizationRevisions.classId,
      encryptedSnapshot: finalizationRevisions.encryptedSnapshot,
      signedByUserId: finalizationRevisions.signedByUserId,
      signedByName: finalizationRevisions.signedByName,
      signedAt: finalizationRevisions.signedAt,
      attestationVersion: finalizationRevisions.attestationVersion,
      fireSignerUserId: finalizationRevisions.fireSignerUserId,
      fireSignature: {
        name: finalizationFireAttestations.signedByName,
        signedAt: finalizationFireAttestations.signedAt,
        attestationVersion: finalizationFireAttestations.attestationVersion,
        signedByUserId: finalizationFireAttestations.signedByUserId,
      },
    })
    .from(finalizationRevisions)
    .leftJoin(
      finalizationFireAttestations,
      eq(finalizationFireAttestations.revisionId, finalizationRevisions.id),
    )
    .where(eq(finalizationRevisions.id, revisionId))
    .limit(1);
  if (!revision) throw new Error("Finalization revision not found.");
  await assertRosterAuthority(db, actor, revision.classId);
  let parsed: FinalizationSnapshot;
  try {
    parsed = JSON.parse(
      decryptCredential(revision.encryptedSnapshot),
    ) as FinalizationSnapshot;
  } catch {
    throw new UnreadableRevisionSnapshotError();
  }
  const attestations = await db
    .select({
      scope: revisionAttestations.scope,
      signedByUserId: revisionAttestations.signedByUserId,
      signedByName: revisionAttestations.signedByName,
      signedAt: revisionAttestations.signedAt,
      attestationVersion: revisionAttestations.attestationVersion,
    })
    .from(revisionAttestations)
    .where(eq(revisionAttestations.revisionId, revisionId));
  const rosterAttestation = attestations.find(
    (attestation) => attestation.scope === "roster",
  );
  const fireAttestation = attestations.find(
    (attestation) => attestation.scope === "fire",
  );
  // Prefer the signing facts stored on the revision row so the printed
  // signature reflects the signer at finalization, not a later profile edit.
  const legacyRosterSignature = revision.signedByName
    ? {
        name: revision.signedByName,
        signedAt: revision.signedAt ? revision.signedAt.toISOString() : null,
        attestationVersion: revision.attestationVersion,
      }
    : parsed.signature;
  const legacyFireSignature = revision.fireSignature?.name
    ? {
        name: revision.fireSignature.name,
        signedAt: revision.fireSignature.signedAt
          ? revision.fireSignature.signedAt.toISOString()
          : null,
        attestationVersion: revision.fireSignature.attestationVersion,
        signedByUserId: revision.fireSignature.signedByUserId,
      }
    : parsed.fireSignature;
  const requiresFire = (parsed.destinations ?? []).some(
    (destination) => destination.code === "fire",
  );
  // Before the Fire signature existed, one signer covered every document on a
  // Fire revision. A Change 1 revision with a pending assistant leaves
  // `fireSignerUserId` set, so it never falls back to the lead's signature.
  const fireSignature = fireAttestation
    ? {
        name: fireAttestation.signedByName,
        signedAt: fireAttestation.signedAt.toISOString(),
        attestationVersion: fireAttestation.attestationVersion,
        signedByUserId: fireAttestation.signedByUserId,
      }
    : (legacyFireSignature ??
      (requiresFire &&
      revision.fireSignerUserId === null &&
      legacyRosterSignature
        ? legacyRosterSignature
        : undefined));
  return {
    ...parsed,
    rosterAttested: Boolean(rosterAttestation),
    fireAttested: Boolean(fireAttestation),
    legacy: attestations.length === 0,
    fireSignerUserId:
      revision.fireSignerUserId ?? parsed.fireSignerUserId ?? null,
    signature: rosterAttestation
      ? {
          name: rosterAttestation.signedByName,
          signedAt: rosterAttestation.signedAt.toISOString(),
          attestationVersion: rosterAttestation.attestationVersion,
        }
      : legacyRosterSignature,
    fireSignature,
  };
}

function setText(pdf: PDFDocument, name: string | undefined, value: string) {
  if (!name) throw new Error("Approved template mapping is incomplete.");
  const field = pdf.getForm().getTextField(name);
  field.setText(value.slice(0, 500));
}

// KFS-1A checkbox fields, mapped by position from the approved template.
const KFS_LEAD_LEVEL_FIELDS: Record<number, string> = {
  1: "Check Box2",
  2: "Check Box3",
  3: "Check Box4",
};
const KFS_ASSIST_LEVEL_FIELDS: Record<number, string> = {
  1: "Check Box5",
  2: "Check Box6",
  3: "Check Box7",
};
const KFS_METHOD_FIELDS: Array<Record<string, string>> = [
  { cr: "Check Box8", ho: "Check Box9", ol: "Check Box10" },
  { cr: "Check Box11", ho: "Check Box12", ol: "Check Box13" },
];

function setCheck(pdf: PDFDocument, name: string, checked: boolean) {
  if (!checked) return;
  try {
    pdf.getForm().getCheckBox(name).check();
  } catch {
    // A missing checkbox must not fail the whole roster.
  }
}

function fillKfsPage(
  pdf: PDFDocument,
  snapshot: FinalizationSnapshot,
  attendees: SnapshotAttendance[],
) {
  const mapping = getTemplateMapping("kfs-1a");
  if (snapshot.fireSignerUserId && !snapshot.fireSignature?.name) {
    throw new Error(
      "The Fire roster cannot be generated until the fire instructor signs.",
    );
  }
  const fireSigner =
    resolveFireSigner(snapshot.instructors) ??
    snapshot.instructors.find((instructor) => instructor.isLead);
  const otherInstructor = snapshot.instructors.find(
    (instructor) => instructor !== fireSigner,
  );
  const fireSignatureName =
    snapshot.fireSignature?.name ?? snapshot.signature?.name ?? "";
  const subjects = snapshot.components ?? [];

  setText(pdf, mapping.fields.date, formatDate(snapshot.class.completedAt));
  setText(pdf, mapping.fields.hostAgency, attendees[0]?.agencyName ?? "");
  setText(pdf, mapping.fields.location, snapshot.class.siteName ?? "");
  setText(pdf, mapping.fields.leadInstructor, fireSigner?.name ?? "");
  setText(pdf, mapping.fields.assistingInstructor, otherInstructor?.name ?? "");
  setText(pdf, mapping.fields.leadFfn, fireSigner?.ffn ?? "");
  setText(pdf, mapping.fields.assistingFfn, otherInstructor?.ffn ?? "");
  if (fireSigner?.level) {
    setCheck(pdf, KFS_LEAD_LEVEL_FIELDS[fireSigner.level] ?? "", true);
  }
  if (otherInstructor?.level) {
    setCheck(pdf, KFS_ASSIST_LEVEL_FIELDS[otherInstructor.level] ?? "", true);
  }

  const subjectRows = [
    {
      category: mapping.fields.categoryRow1,
      className: mapping.fields.classNameRow1,
      curriculum: mapping.fields.curriculumRow1,
      lessonPlan: mapping.fields.lessonPlanRow1,
      start: mapping.fields.startRow1,
      end: mapping.fields.endRow1,
      hours: mapping.fields.hoursRow1,
      method: KFS_METHOD_FIELDS[0] ?? {},
    },
    {
      category: mapping.fields.categoryRow2,
      className: mapping.fields.classNameRow2,
      curriculum: mapping.fields.curriculumRow2,
      lessonPlan: mapping.fields.lessonPlanRow2,
      start: mapping.fields.startRow2,
      end: mapping.fields.endRow2,
      hours: mapping.fields.hoursRow2,
      method: KFS_METHOD_FIELDS[1] ?? {},
    },
  ];
  subjectRows.forEach((row, index) => {
    const component = subjects[index];
    if (!component) return;
    setText(pdf, row.category, component.category ?? "");
    setText(
      pdf,
      row.className,
      component.className ?? snapshot.class.courseName,
    );
    setText(pdf, row.curriculum, composeCurriculumLabel(component));
    setText(
      pdf,
      row.lessonPlan,
      component.lessonPlan ?? component.title ?? snapshot.class.courseName,
    );
    setText(pdf, row.start, formatTime(component.startsAt));
    setText(pdf, row.end, formatTime(component.endsAt));
    setText(pdf, row.hours, component.creditedHours);
    for (const method of parseComponentMethod(component.method)) {
      setCheck(pdf, row.method[method] ?? "", true);
    }
  });

  attendees.forEach((attendee, index) => {
    const row = index + 1;
    const [firstName = "", ...lastName] = attendeeName(attendee).split(" ");
    setText(
      pdf,
      `FFNRow${row}`,
      snapshotIdentifier(snapshot, attendee.attendanceId),
    );
    setText(pdf, `LAST NAMERow${row}`, lastName.join(" "));
    setText(pdf, `FIRST NAMERow${row}`, firstName);
    setText(pdf, `HOURSRow${row}`, attendee.creditedHours);
    if (mapping.attendeeInitialsField) {
      setText(
        pdf,
        `${mapping.attendeeInitialsField}${row}`,
        attendeeInitials(attendeeName(attendee)),
      );
    }
  });

  setText(pdf, mapping.fields.leadSignature, fireSignatureName);
  setText(
    pdf,
    mapping.fields.instructorInitials,
    fireSignatureName ? attendeeInitials(fireSignatureName) : "",
  );
}

const TEMPLATE_ASSET_DIR = join(
  process.cwd(),
  "src",
  "modules",
  "official-roster-pdfs",
);

const TEMPLATE_FONT_DIR = join(TEMPLATE_ASSET_DIR, "fonts");

export interface TemplateRenderFonts {
  // The face used for fields without a specific override.
  body: PDFFont;
  // Resolves the face a named field renders in.
  forField: (name: string) => PDFFont;
}

/** Embeds a bundled template font, subset to the glyphs the document uses. */
async function embedTemplateFont(
  pdf: PDFDocument,
  assetName: string,
): Promise<PDFFont> {
  // Custom fonts require fontkit; standard fonts do not.
  pdf.registerFontkit(fontkit);
  const bytes = await readFile(join(TEMPLATE_FONT_DIR, assetName));
  return pdf.embedFont(bytes, { subset: true });
}

export async function renderPage(
  mapping: TemplateMapping,
  fill: (pdf: PDFDocument, fonts: TemplateRenderFonts) => void | Promise<void>,
  options: { flatten?: boolean } = {},
): Promise<PDFDocument> {
  const source = await readFile(join(TEMPLATE_ASSET_DIR, mapping.assetName));
  const pdf = await PDFDocument.load(source);

  // Embed the template fonts first so field values are measured and written in
  // the same face their appearance streams will use.
  const bodyFont = mapping.fonts
    ? await embedTemplateFont(pdf, mapping.fonts.body)
    : await pdf.embedFont(StandardFonts.Helvetica);
  const overrideFonts = new Map<string, PDFFont>();
  for (const [name, assetName] of Object.entries(mapping.fonts?.fields ?? {})) {
    overrideFonts.set(name, await embedTemplateFont(pdf, assetName));
  }
  const fonts: TemplateRenderFonts = {
    body: bodyFont,
    forField: (name) => overrideFonts.get(name) ?? bodyFont,
  };

  await fill(pdf, fonts);

  const form = pdf.getForm();
  if (mapping.clearFieldBackgrounds) {
    for (const field of form.getFields()) {
      for (const widget of field.acroField.getWidgets()) {
        widget.getAppearanceCharacteristics()?.dict.delete(PDFName.of("BG"));
      }
    }
  }
  for (const name of mapping.centerFields ?? []) {
    form.getTextField(name).setAlignment(TextAlignment.Center);
  }
  for (const name of mapping.wrapFields ?? []) {
    form.getTextField(name).enableMultiline();
  }

  form.updateFieldAppearances(bodyFont);
  for (const [name, font] of overrideFonts) {
    form.getTextField(name).updateAppearances(font);
  }
  if (options.flatten ?? true) {
    // Appearances already carry the per-field fonts; do not regenerate them.
    form.flatten({ updateFieldAppearances: false });
  }
  return pdf;
}

/**
 * Renders a single official-roster page. Exposed so verification tests can
 * inspect populated form fields before flattening; production generation uses
 * `renderOfficialRoster`, which flattens every page.
 */
export async function renderRosterPage(
  formType: OfficialRosterForm,
  snapshot: FinalizationSnapshot,
  attendees: SnapshotAttendance[],
  options: { flatten?: boolean; page?: number; pageCount?: number } = {},
): Promise<PDFDocument> {
  const mapping = getTemplateMapping(formType);
  return renderPage(mapping, (pdf) => fillKfsPage(pdf, snapshot, attendees), {
    flatten: options.flatten ?? true,
  });
}

export async function renderOfficialRoster(
  formType: OfficialRosterForm,
  snapshot: FinalizationSnapshot,
): Promise<Uint8Array> {
  const mapping = getTemplateMapping(formType);
  // The Fire Commission credits training hours only to attendees with a valid
  // FFN, so the KFS-1A carries that eligible subset. Every other form covers
  // all attendees.
  const attendance =
    formType === "kfs-1a"
      ? fireEligibleAttendance(snapshot)
      : snapshot.attendance;
  const pages = split(attendance, mapping.pageCapacity);
  if (!pages.length) pages.push([]);
  const output = await PDFDocument.create();
  for (const [index, attendees] of pages.entries()) {
    const page = await renderRosterPage(formType, snapshot, attendees, {
      page: index + 1,
      pageCount: pages.length,
    });
    const copied = await output.copyPages(page, [0]);
    output.addPage(copied[0]);
  }
  // Fixed metadata keeps equivalent finalized inputs byte-for-byte reproducible.
  output.setCreationDate(new Date(0));
  output.setModificationDate(new Date(0));
  output.setCreator("Roster Command");
  output.setProducer("Roster Command");
  output.setTitle(`${mapping.formType} official roster`);
  return output.save({ useObjectStreams: false });
}

export async function generateOfficialRoster(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
  formType: OfficialRosterForm,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const snapshot = await readSnapshot(db, actor, revisionId);
  const mapping = getTemplateMapping(formType);
  return {
    bytes: await renderOfficialRoster(formType, snapshot),
    filename: `${formType}-${mapping.templateVersion}.pdf`,
  };
}

const recipientSchema = z.string().trim().email().max(320);

export function validateOfficialRosterRecipient(value: string): string {
  return recipientSchema.parse(value);
}

async function sendWithResend(input: {
  recipient: string;
  filename: string;
  bytes: Uint8Array;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Official roster email is not configured.");
  }
  try {
    const logo = await loadLogoAttachment();
    const body = `
      <p style="margin:0 0 6px;font-family:${FONT_STACK};color:${BRAND.red};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Official Roster</p>
      <h1 style="margin:0 0 16px;font-family:${FONT_STACK};color:#111827;font-size:22px;font-weight:700;">Training roster</h1>
      <p style="margin:0 0 20px;font-family:${FONT_STACK};color:#374151;font-size:15px;line-height:1.6;">An official training roster is attached to this message.</p>
      <p style="margin:0;font-family:${FONT_STACK};color:${BRAND.muted};font-size:13px;line-height:1.6;">Winchester Fire Department<br />Training Division</p>`;
    await sendEmail({
      recipient: input.recipient,
      subject: "Official training roster",
      html: emailShell(body),
      text: "An official training roster PDF is attached.",
      attachments: [logo, { filename: input.filename, bytes: input.bytes }],
    });
  } catch {
    throw new Error("Official roster email could not be sent.");
  }
}

export async function emailOfficialRoster(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
  formType: OfficialRosterForm,
  recipientInput: string,
): Promise<void> {
  const recipient = validateOfficialRosterRecipient(recipientInput);
  const roster = await generateOfficialRoster(db, actor, revisionId, formType);
  await sendWithResend({ recipient, ...roster });
  await db.transaction(async (transaction) => {
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "official_roster.email.sent",
      entityType: "finalization_revision",
      entityId: revisionId,
      details: {
        formType,
        recipient,
        sender: "noreply@winchesterfireems.com",
      },
    });
  });
}
