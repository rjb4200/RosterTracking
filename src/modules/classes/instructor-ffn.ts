import "server-only";

import { inArray } from "drizzle-orm";

import type { DatabaseTransaction } from "@/server/db/client";
import { users } from "@/server/db/schema";

import { isFireInstructor } from "./fire-signer";

export interface FireInstructorProfile {
  displayName: string;
  ffn: string | null;
  instructorLevel: number | null;
}

/**
 * A Fire class needs a fire-qualified lead: a valid Fire Commission FFN and a
 * Fire Instructor level of 1, 2, or 3.
 */
export function validateFireInstructors(
  profiles: FireInstructorProfile[],
): void {
  const lead = profiles[0];
  if (!lead) {
    throw new Error(
      "Assign a fire-qualified lead instructor for Fire reporting.",
    );
  }
  if (isFireInstructor(lead)) return;
  throw new Error(
    `Fire classes require the lead instructor to have a valid FFN in the format 0000-0000 and a Fire Instructor level (1, 2, or 3). Update the staff profile for: ${lead.displayName}.`,
  );
}

/** Lock the profiles so validation and assignment use the same facts. */
export async function requireFireInstructor(
  transaction: DatabaseTransaction,
  instructorIds: string[],
): Promise<void> {
  const ids = [...new Set(instructorIds)].sort();
  if (ids.length === 0) {
    throw new Error("Assign a lead instructor for Fire reporting.");
  }
  const profiles = await transaction
    .select({
      id: users.id,
      displayName: users.displayName,
      ffn: users.ffn,
      instructorLevel: users.instructorLevel,
      isActive: users.isActive,
    })
    .from(users)
    .where(inArray(users.id, ids))
    .orderBy(users.id)
    .for("share");
  if (
    profiles.length !== ids.length ||
    profiles.some(({ isActive }) => !isActive)
  ) {
    throw new Error("Select active staff instructors for Fire reporting.");
  }
  validateFireInstructors(profiles);
}
