import { BRAND, emailShell, FONT_STACK } from "./layout";

export const CERTIFICATE_EMAIL_TEMPLATE = "completion-certificate";
export const CERTIFICATE_EMAIL_TEMPLATE_VERSION =
  "completion-certificate-email-002";

export interface CertificateEmailInstructor {
  name: string;
  isLead: boolean;
}

export interface CertificateEmailInput {
  participantName: string;
  courseName: string;
  completedAt: string | null;
  classHours: string;
  instructors: CertificateEmailInstructor[];
  agencyName: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function detailRow(label: string, value: string): string {
  return `<tr><td style="padding:8px 16px 8px 0;color:${BRAND.muted};font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:8px 0;color:${BRAND.ink};font-size:14px;font-weight:600;">${value}</td></tr>`;
}

/** Lead instructor first, then assisting instructors, each labelled. */
export function instructorLabel(
  instructors: CertificateEmailInstructor[],
): string {
  const lead = instructors.find((instructor) => instructor.isLead);
  const assisting = instructors.filter((instructor) => !instructor.isLead);
  const parts: string[] = [];
  if (lead) parts.push(`${escapeHtml(lead.name)} (Lead)`);
  for (const instructor of assisting) {
    parts.push(`${escapeHtml(instructor.name)} (Assisting)`);
  }
  return parts.join("<br />");
}

/** Renders the formal per-participant certificate message. */
export function renderCertificateEmail(
  input: CertificateEmailInput,
): RenderedEmail {
  const course = escapeHtml(input.courseName);
  const participant = escapeHtml(input.participantName);
  const hours = escapeHtml(input.classHours);
  const completed = input.completedAt ? escapeHtml(input.completedAt) : null;
  const agency = input.agencyName ? escapeHtml(input.agencyName) : null;
  const instructors = instructorLabel(input.instructors);

  const rows = [
    detailRow("Course", course),
    completed ? detailRow("Completion date", completed) : "",
    input.classHours ? detailRow("Class hours", hours) : "",
    instructors ? detailRow("Instructor", instructors) : "",
    agency ? detailRow("Agency", agency) : "",
  ].join("");

  const body = `
    <p style="margin:0 0 6px;font-family:${FONT_STACK};color:${BRAND.red};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Certificate of Completion</p>
    <h1 style="margin:0 0 16px;font-family:${FONT_STACK};color:#111827;font-size:24px;font-weight:700;">${participant}</h1>
    <p style="margin:0 0 20px;font-family:${FONT_STACK};color:#374151;font-size:15px;line-height:1.6;">
      This certifies that the named participant has satisfactorily completed the following course.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};margin:0 0 20px;">
      ${rows}
    </table>
    <p style="margin:0 0 20px;font-family:${FONT_STACK};color:#374151;font-size:15px;line-height:1.6;">
      Your signed certificate is attached to this message. Keep it for your records.
    </p>
    <p style="margin:0;font-family:${FONT_STACK};color:${BRAND.muted};font-size:13px;line-height:1.6;">
      Winchester Fire Department<br />Training Division
    </p>`;

  const text = [
    "Winchester Fire Department",
    "CERTIFICATE OF COMPLETION",
    "",
    input.participantName,
    "This certifies that the named participant has satisfactorily completed the following course.",
    "",
    `Course: ${input.courseName}`,
    ...(input.completedAt ? [`Completion date: ${input.completedAt}`] : []),
    ...(input.classHours ? [`Class hours: ${input.classHours}`] : []),
    ...(input.instructors.length
      ? [
          `Instructor: ${input.instructors
            .map(
              (instructor) =>
                `${instructor.name} (${instructor.isLead ? "Lead" : "Assisting"})`,
            )
            .join(", ")}`,
        ]
      : []),
    ...(input.agencyName ? [`Agency: ${input.agencyName}`] : []),
    "",
    "Your signed certificate is attached to this message. Keep it for your records.",
    "Training Division",
  ].join("\n");

  return {
    subject: `Certificate of Completion — ${input.courseName}`,
    html: emailShell(body),
    text,
  };
}

export const TRAINING_NOTICE_EMAIL_TEMPLATE = "individual-training-notice";
export const TRAINING_NOTICE_EMAIL_TEMPLATE_VERSION =
  "individual-training-notice-email-001";

export interface TrainingNoticeEmailInput {
  participantName: string;
  courseName: string;
  completedAt: string | null;
  totalHours: string;
  agencyName: string | null;
}

/** Renders the per-firefighter individual training notice message. */
export function renderTrainingNoticeEmail(
  input: TrainingNoticeEmailInput,
): RenderedEmail {
  const participant = escapeHtml(input.participantName);
  const course = escapeHtml(input.courseName);
  const completed = input.completedAt ? escapeHtml(input.completedAt) : null;
  const agency = input.agencyName ? escapeHtml(input.agencyName) : null;

  const rows = [
    detailRow("Course", course),
    completed ? detailRow("Date", completed) : "",
    input.totalHours
      ? detailRow("Total hours", escapeHtml(input.totalHours))
      : "",
    agency ? detailRow("Agency", agency) : "",
  ].join("");

  const body = `
    <p style="margin:0 0 6px;font-family:${FONT_STACK};color:${BRAND.red};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Individual Training Notice</p>
    <h1 style="margin:0 0 16px;font-family:${FONT_STACK};color:#111827;font-size:24px;font-weight:700;">${participant}</h1>
    <p style="margin:0 0 20px;font-family:${FONT_STACK};color:#374151;font-size:15px;line-height:1.6;">
      This records training you completed through Winchester Fire Department for the agency you represent.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};margin:0 0 20px;">
      ${rows}
    </table>
    <p style="margin:0 0 20px;font-family:${FONT_STACK};color:#374151;font-size:15px;line-height:1.6;">
      Your signed individual training notice is attached to this message.
    </p>
    <p style="margin:0;font-family:${FONT_STACK};color:${BRAND.muted};font-size:13px;line-height:1.6;">
      Winchester Fire Department<br />Training Division
    </p>`;

  const text = [
    "Winchester Fire Department",
    "INDIVIDUAL TRAINING NOTICE",
    "",
    input.participantName,
    "This records training you completed through Winchester Fire Department for the agency you represent.",
    "",
    `Course: ${input.courseName}`,
    ...(input.completedAt ? [`Date: ${input.completedAt}`] : []),
    ...(input.totalHours ? [`Total hours: ${input.totalHours}`] : []),
    ...(input.agencyName ? [`Agency: ${input.agencyName}`] : []),
    "",
    "Your signed individual training notice is attached to this message.",
    "Training Division",
  ].join("\n");

  return {
    subject: `Individual training notice — ${input.courseName}`,
    html: emailShell(body),
    text,
  };
}
