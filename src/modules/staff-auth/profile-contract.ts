import { z } from "zod";
import {
  FFN_FORMAT_MESSAGE,
  normalizeFfn,
} from "@/modules/reference/credential-format";

export const INSTRUCTOR_LEVELS = [1, 2, 3] as const;

export type InstructorLevel = (typeof INSTRUCTOR_LEVELS)[number];

export { FFN_PATTERN } from "@/modules/reference/credential-format";

export interface ProfileValues {
  ffn: string | null;
  instructorLevel: number | null;
  emsProviderNumber: string | null;
}

export interface StaffProfile extends ProfileValues {
  userId: string;
}

export interface ProfileActionState {
  error?: string;
  success?: string;
}

const optionalText = z.string().trim().max(100).default("");

const profileInputSchema = z.object({
  ffn: optionalText,
  instructorLevel: optionalText,
  emsProviderNumber: optionalText,
});

export type ProfileInput = z.input<typeof profileInputSchema>;

export function isInstructorLevel(value: number): value is InstructorLevel {
  return (INSTRUCTOR_LEVELS as readonly number[]).includes(value);
}

/**
 * Normalizes and validates raw profile input. Empty strings become null so the
 * database stores "not recorded" rather than a blank value, and an FFN is
 * normalized to four digits, a dash, and four digits (for example `0634-4600`),
 * so a loose 8-digit entry like `06344600` is accepted.
 */
export function parseProfileInput(input: ProfileInput): ProfileValues {
  const parsed = profileInputSchema.parse(input);

  let ffn: string | null = null;
  if (parsed.ffn !== "") {
    ffn = normalizeFfn(parsed.ffn);
    if (!ffn) throw new Error(FFN_FORMAT_MESSAGE);
  }

  const levelText = parsed.instructorLevel;
  let instructorLevel: number | null = null;
  if (levelText !== "") {
    const level = Number(levelText);
    if (!Number.isInteger(level) || !isInstructorLevel(level)) {
      throw new Error("Certification level must be 1, 2, or 3.");
    }
    instructorLevel = level;
  }

  const emsProviderNumber =
    parsed.emsProviderNumber === "" ? null : parsed.emsProviderNumber;

  return { ffn, instructorLevel, emsProviderNumber };
}

export function changedProfileAttributes(
  before: ProfileValues,
  after: ProfileValues,
): string[] {
  const changed: string[] = [];
  if (before.ffn !== after.ffn) changed.push("ffn");
  if (before.instructorLevel !== after.instructorLevel) {
    changed.push("instructorLevel");
  }
  if (before.emsProviderNumber !== after.emsProviderNumber) {
    changed.push("emsProviderNumber");
  }
  return changed;
}
