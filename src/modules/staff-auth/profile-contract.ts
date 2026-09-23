import { z } from "zod";

export const INSTRUCTOR_LEVELS = [1, 2, 3] as const;

export type InstructorLevel = (typeof INSTRUCTOR_LEVELS)[number];

export const FFN_PATTERN = /^\d{4}-\d{4}$/;

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
 * database stores "not recorded" rather than a blank value, and an FFN must use
 * the Fire Commission's eight-digit `0000-0000` form because it is printed on
 * official rosters.
 */
export function parseProfileInput(input: ProfileInput): ProfileValues {
  const parsed = profileInputSchema.parse(input);

  const ffn = parsed.ffn === "" ? null : parsed.ffn;
  if (ffn !== null && !FFN_PATTERN.test(ffn)) {
    throw new Error("FFN must use the form 0000-0000.");
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
