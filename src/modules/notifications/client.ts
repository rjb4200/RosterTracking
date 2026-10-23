import "server-only";

import { z } from "zod";

export const EMAIL_SENDER = "noreply@winchesterfireems.com";

const recipientSchema = z.string().trim().email().max(320);

export function validateEmailRecipient(value: string): string {
  return recipientSchema.parse(value);
}

export interface EmailAttachment {
  filename: string;
  bytes: Uint8Array;
  // When set, the attachment is sent inline and referenced from the HTML body
  // as `cid:<contentId>` rather than appearing as a downloadable attachment.
  contentId?: string;
  contentType: string;
}

export interface OutboundEmail {
  recipient: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  providerMessageId: string | null;
}

/**
 * Sends one email through Resend using the shared verified sender. Throws a
 * plain, non-leaking error when delivery is not configured or the provider
 * rejects the request; callers record the failure rather than surfacing it.
 */
export async function sendEmail(
  message: OutboundEmail,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_SENDER,
      to: [message.recipient],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((attachment) => ({
              filename: attachment.filename,
              content: Buffer.from(attachment.bytes).toString("base64"),
              content_type: attachment.contentType,
              ...(attachment.contentId
                ? { content_id: attachment.contentId }
                : {}),
            })),
          }
        : {}),
    }),
  });
  if (!response.ok) throw new Error("Email could not be sent.");
  let payload: { id?: string } = {};
  try {
    payload = (await response.json()) as { id?: string };
  } catch {
    payload = {};
  }
  return { providerMessageId: payload.id ?? null };
}
