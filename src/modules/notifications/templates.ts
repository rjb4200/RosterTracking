export const CERTIFICATE_EMAIL_TEMPLATE = "completion-certificate";
export const CERTIFICATE_EMAIL_TEMPLATE_VERSION =
  "completion-certificate-email-001";

export interface CertificateEmailInput {
  participantName: string;
  courseName: string;
  completedAt: string | null;
  classHours: string;
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
  return `<tr><td style="padding:6px 12px 6px 0;color:#4b5563;font-size:14px;">${label}</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${value}</td></tr>`;
}

/** Renders the branded per-participant certificate message template. */
export function renderCertificateEmail(
  input: CertificateEmailInput,
): RenderedEmail {
  const course = escapeHtml(input.courseName);
  const participant = escapeHtml(input.participantName);
  const hours = escapeHtml(input.classHours);
  const completed = input.completedAt
    ? escapeHtml(input.completedAt)
    : "&mdash;";
  const rows = [
    detailRow("Course", course),
    detailRow("Completion date", completed),
    input.classHours ? detailRow("Class hours", hours) : "",
  ].join("");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#7f1d1d;padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.3px;">Winchester Fire-EMS</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">Certificate of Completion</h1>
                <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hello ${participant},</p>
                <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.5;">
                  Your course-completion certificate is attached to this email. It is signed by the class's lead instructor.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:0 0 20px;">
                  ${rows}
                </table>
                <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
                  Keep this certificate for your records. Reply to this message if you have any questions.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;padding:16px 28px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  Winchester Fire-EMS &middot; noreply@winchesterfireems.com
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const text = [
    `Certificate of Completion`,
    `Hello ${input.participantName},`,
    `Your course-completion certificate for ${input.courseName} is attached.`,
    input.completedAt ? `Completion date: ${input.completedAt}` : "",
    input.classHours ? `Class hours: ${input.classHours}` : "",
    `Keep this certificate for your records.`,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    subject: `Your completion certificate — ${input.courseName}`,
    html,
    text,
  };
}
