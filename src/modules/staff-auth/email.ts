import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(320);

/**
 * Normalizes a staff account email to trimmed lower case and validates it, so
 * it can be compared and stored case-insensitively.
 */
export function normalizeEmail(email: string): string {
  return emailSchema.parse(email);
}

/** True when an account has no usable email and should be prompted to add one. */
export function needsEmailPrompt(email: string | null | undefined): boolean {
  return !email || email.trim() === "";
}
