import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";

import {
  composeCurriculumLabel,
  parseComponentMethod,
} from "@/modules/classes/fire-subjects";
import { loadLogoAttachment } from "@/modules/notifications/assets";
import { sendEmail } from "@/modules/notifications/client";
import { BRAND, emailShell, FONT_STACK } from "@/modules/notifications/layout";
import { decryptCredential } from "@/modules/reference/crypto";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";
import { writeAuditLog } from "@/server/db/audit";
import type { Database } from "@/server/db/client";
import {
  classInstructors,
  finalizationRevisions,
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
  creditedHours: string;
  firstName: string | null;
  lastName: string | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  // Recipient email captured at finalization for certificate delivery. Null
  // when the participant has no deliverable address (a legacy student or a
  // guest recorded before guest email was required).
  email?: string | null;
}

export interface FinalizationSnapshot {
  class: {
    courseName: string;
    siteName: string | null;
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
  // Optional because revisions written before MTU tracking have no usage facts.
  mtuUsage?: {
    equipmentUsed: string | null;
    mileage: string | null;
    usedSupplies: string | null;
  } | null;
  instructors: Array<{
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

function formatTime(value: string | undefined): string {
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
      signedByName: finalizationRevisions.signedByName,
      signedAt: finalizationRevisions.signedAt,
      attestationVersion: finalizationRevisions.attestationVersion,
    })
    .from(finalizationRevisions)
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
  // Prefer the signing facts stored on the revision row so the printed
  // signature reflects the signer at finalization, not a later profile edit.
  return {
    ...parsed,
    signature: revision.signedByName
      ? {
          name: revision.signedByName,
          signedAt: revision.signedAt ? revision.signedAt.toISOString() : null,
          attestationVersion: revision.attestationVersion,
        }
      : parsed.signature,
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
  const lead = snapshot.instructors.find((instructor) => instructor.isLead);
  const assisting = snapshot.instructors.filter(
    (instructor) => !instructor.isLead,
  );
  const subjects = snapshot.components ?? [];

  setText(pdf, mapping.fields.date, formatDate(snapshot.class.completedAt));
  setText(pdf, mapping.fields.hostAgency, attendees[0]?.agencyName ?? "");
  setText(pdf, mapping.fields.location, snapshot.class.siteName ?? "");
  setText(pdf, mapping.fields.leadInstructor, lead?.name ?? "");
  setText(
    pdf,
    mapping.fields.assistingInstructor,
    assisting.map((instructor) => instructor.name).join(", "),
  );
  setText(pdf, mapping.fields.leadFfn, lead?.ffn ?? "");
  setText(pdf, mapping.fields.assistingFfn, assisting[0]?.ffn ?? "");
  if (lead?.level) {
    setCheck(pdf, KFS_LEAD_LEVEL_FIELDS[lead.level] ?? "", true);
  }
  if (assisting[0]?.level) {
    setCheck(pdf, KFS_ASSIST_LEVEL_FIELDS[assisting[0].level] ?? "", true);
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

  setText(pdf, mapping.fields.leadSignature, snapshot.signature?.name ?? "");
  setText(
    pdf,
    mapping.fields.instructorInitials,
    snapshot.signature?.name ? attendeeInitials(snapshot.signature.name) : "",
  );
}

export async function renderPage(
  mapping: TemplateMapping,
  fill: (pdf: PDFDocument) => void,
  options: { flatten?: boolean } = {},
): Promise<PDFDocument> {
  const source = await readFile(
    join(
      process.cwd(),
      "src",
      "modules",
      "official-roster-pdfs",
      mapping.assetName,
    ),
  );
  const pdf = await PDFDocument.load(source);
  fill(pdf);
  const form = pdf.getForm();
  for (const name of mapping.wrapFields ?? []) {
    form.getTextField(name).enableMultiline();
  }
  form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
  if (options.flatten ?? true) form.flatten();
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
  const pages = split(snapshot.attendance, mapping.pageCapacity);
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
