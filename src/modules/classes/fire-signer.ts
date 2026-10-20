import { isValidFfn } from "@/modules/reference/credential-format";

/** Attributes that make a staff member eligible to sign Fire paperwork. */
export interface FireInstructorAttributes {
  ffn?: string | null;
  level?: number | null;
  instructorLevel?: number | null;
}

export interface FireSignerCandidate extends FireInstructorAttributes {
  userId: string;
  isLead: boolean;
}

/** A fire instructor has a valid Fire Commission FFN and an instructor level. */
export function isFireInstructor(profile: FireInstructorAttributes): boolean {
  const level = profile.level ?? profile.instructorLevel ?? null;
  return (
    isValidFfn(profile.ffn ?? null) &&
    (level === 1 || level === 2 || level === 3)
  );
}

/**
 * The Fire signer is the fire-eligible lead when the lead is eligible, and
 * otherwise the fire-eligible assistant. There is at most one assistant.
 */
export function resolveFireSigner<T extends FireSignerCandidate>(
  instructors: readonly T[],
): T | null {
  const lead = instructors.find((instructor) => instructor.isLead);
  if (lead && isFireInstructor(lead)) return lead;
  const assistant = instructors.find((instructor) => !instructor.isLead);
  if (assistant && isFireInstructor(assistant)) return assistant;
  return null;
}
