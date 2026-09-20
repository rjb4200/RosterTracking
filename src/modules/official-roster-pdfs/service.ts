import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";

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

import {
  getTemplateMapping,
  type OfficialRosterForm,
  type TemplateMapping,
} from "./mappings";

export interface OfficialRosterActor {
  id: string;
  username: string;
}

interface SnapshotAttendance {
  attendanceId: string;
  agencyName: string;
  creditedHours: string;
  firstName: string | null;
  lastName: string | null;
  guestFirstName: string | null;
  guestLastName: string | null;
}

export interface FinalizationSnapshot {
  class: {
    courseName: string;
    siteName: string | null;
    completedAt: string | null;
  };
  instructors: Array<{ name: string; isLead: boolean }>;
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
    startsAt: string;
    endsAt: string;
    creditedHours: string;
  }>;
}

function formatDate(value: string | null): string {
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
  formType: OfficialRosterForm,
): string {
  const expectedFields =
    formType === "kfs-1a" ? ["ffn", "studentNumber"] : ["kemsisId"];
  const expectedCredentialCode = formType === "kfs-1a" ? "ffn" : "kemsis";
  const field = snapshot.fieldSnapshots.find(
    (value) =>
      value.attendanceId === attendanceId &&
      expectedFields.includes(value.studentField),
  );
  const credential = snapshot.credentialSnapshots.find(
    (value) =>
      value.attendanceId === attendanceId &&
      value.credentialTypeCode === expectedCredentialCode,
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

async function readSnapshot(
  db: Database,
  actor: OfficialRosterActor,
  revisionId: string,
): Promise<FinalizationSnapshot> {
  const [revision] = await db
    .select({
      classId: finalizationRevisions.classId,
      encryptedSnapshot: finalizationRevisions.encryptedSnapshot,
    })
    .from(finalizationRevisions)
    .where(eq(finalizationRevisions.id, revisionId))
    .limit(1);
  if (!revision) throw new Error("Finalization revision not found.");
  await assertRosterAuthority(db, actor, revision.classId);
  try {
    return JSON.parse(
      decryptCredential(revision.encryptedSnapshot),
    ) as FinalizationSnapshot;
  } catch {
    throw new UnreadableRevisionSnapshotError();
  }
}

function setText(pdf: PDFDocument, name: string | undefined, value: string) {
  if (!name) throw new Error("Approved template mapping is incomplete.");
  const field = pdf.getForm().getTextField(name);
  field.setText(value.slice(0, 500));
}

function fillKfsPage(
  pdf: PDFDocument,
  snapshot: FinalizationSnapshot,
  attendees: SnapshotAttendance[],
) {
  const mapping = getTemplateMapping("kfs-1a");
  const lead =
    snapshot.instructors.find((instructor) => instructor.isLead)?.name ?? "";
  const assisting = snapshot.instructors
    .filter((instructor) => !instructor.isLead)
    .map((instructor) => instructor.name)
    .join(", ");
  const component = snapshot.components?.[0];
  setText(pdf, mapping.fields.date, formatDate(snapshot.class.completedAt));
  setText(pdf, mapping.fields.hostAgency, attendees[0]?.agencyName ?? "");
  setText(pdf, mapping.fields.location, snapshot.class.siteName ?? "");
  setText(pdf, mapping.fields.leadInstructor, lead);
  setText(pdf, mapping.fields.assistingInstructor, assisting);
  setText(pdf, mapping.fields.className, snapshot.class.courseName);
  setText(
    pdf,
    mapping.fields.component,
    component?.title ?? snapshot.class.courseName,
  );
  setText(pdf, mapping.fields.start, formatTime(component?.startsAt));
  setText(pdf, mapping.fields.end, formatTime(component?.endsAt));
  setText(
    pdf,
    mapping.fields.hours,
    component?.creditedHours ?? attendees[0]?.creditedHours ?? "",
  );
  attendees.forEach((attendee, index) => {
    const row = index + 1;
    const [firstName = "", ...lastName] = attendeeName(attendee).split(" ");
    setText(
      pdf,
      `FFNRow${row}`,
      snapshotIdentifier(snapshot, attendee.attendanceId, "kfs-1a"),
    );
    setText(pdf, `LAST NAMERow${row}`, lastName.join(" "));
    setText(pdf, `FIRST NAMERow${row}`, firstName);
    setText(pdf, `HOURSRow${row}`, attendee.creditedHours);
  });
}

function fillKbemsPage(
  pdf: PDFDocument,
  snapshot: FinalizationSnapshot,
  attendees: SnapshotAttendance[],
  page: number,
  pageCount: number,
) {
  const mapping = getTemplateMapping("kbems-e16");
  const component = snapshot.components?.[0];
  setText(pdf, mapping.fields.courseName, snapshot.class.courseName);
  setText(
    pdf,
    mapping.fields.instructor,
    snapshot.instructors.map((instructor) => instructor.name).join(", "),
  );
  setText(pdf, mapping.fields.location, snapshot.class.siteName ?? "");
  setText(pdf, mapping.fields.date, formatDate(snapshot.class.completedAt));
  setText(pdf, mapping.fields.startTime, formatTime(component?.startsAt));
  setText(pdf, mapping.fields.endTime, formatTime(component?.endsAt));
  setText(pdf, mapping.fields.totalHours, component?.creditedHours ?? "");
  setText(
    pdf,
    mapping.fields.objectives,
    component?.title ?? snapshot.class.courseName,
  );
  setText(pdf, mapping.fields.page, String(page));
  setText(pdf, mapping.fields.pageCount, String(pageCount));
  attendees.forEach((attendee, index) => {
    const row = index + 1;
    setText(pdf, `Student Name PrintRow${row}`, attendeeName(attendee));
    setText(
      pdf,
      `KEMSIS IDRow${row}`,
      snapshotIdentifier(snapshot, attendee.attendanceId, "kbems-e16"),
    );
    setText(pdf, `Affiliated ServiceRow${row}`, attendee.agencyName);
  });
}

async function renderPage(
  mapping: TemplateMapping,
  fill: (pdf: PDFDocument) => void,
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
  pdf
    .getForm()
    .updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
  pdf.getForm().flatten();
  return pdf;
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
    const page = await renderPage(mapping, (pdf) => {
      if (formType === "kfs-1a") fillKfsPage(pdf, snapshot, attendees);
      else fillKbemsPage(pdf, snapshot, attendees, index + 1, pages.length);
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Official roster email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "noreply@winchesterfireems.com",
      to: [input.recipient],
      subject: "Official training roster",
      text: "An official training roster PDF is attached.",
      attachments: [
        {
          filename: input.filename,
          content: Buffer.from(input.bytes).toString("base64"),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error("Official roster email could not be sent.");
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
