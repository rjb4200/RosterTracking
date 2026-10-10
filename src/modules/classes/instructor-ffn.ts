import "server-only";

import { inArray } from "drizzle-orm";

import { isValidFfn } from "@/modules/reference/credential-format";
import type { DatabaseTransaction } from "@/server/db/client";
import { users } from "@/server/db/schema";

export function validateFireInstructorFfns(
  profiles: { displayName: string; ffn: string | null }[],
): void {
  const invalid = profiles.filter(({ ffn }) => !isValidFfn(ffn));
  if (invalid.length > 0) {
    throw new Error(
      `Fire classes require an FFN in the format 0000-0000 for every lead and assisting instructor. Update the staff profile for: ${invalid.map(({ displayName }) => displayName).join(", ")}.`,
    );
  }
}

/** Lock the current profiles so validation and assignment use the same facts. */
export async function requireFireInstructorFfns(
  transaction: DatabaseTransaction,
  instructorIds: string[],
): Promise<void> {
  const ids = [...new Set(instructorIds)].sort();
  if (ids.length === 0)
    throw new Error("Assign a lead instructor for Fire reporting.");
  const profiles = await transaction
    .select({
      id: users.id,
      displayName: users.displayName,
      ffn: users.ffn,
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
  validateFireInstructorFfns(profiles);
}
