import { eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/node-postgres";

import { ROLE_CODES } from "../../../src/modules/staff-auth/permissions";
import type * as schema from "../../../src/server/db/schema";
import { roles, userRoles, users } from "../../../src/server/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * A valid FFN in the `0000-0000` format that is unique within a run. Random per
 * call so no two fixtures — or two repeated runs — can collide on
 * `users_ffn_unique`.
 */
export function uniqueFfn(): string {
  const digits = crypto
    .randomUUID()
    .replace(/\D/g, "")
    .padEnd(8, "0")
    .slice(0, 8);
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
}

/**
 * Creates a staff user with a valid, run-unique FFN and exactly one role. Fire
 * classes require an FFN-format number for every lead and assisting instructor,
 * so fixtures that build a Fire class create instructors through here.
 */
export async function createStaffUser(
  db: Db,
  input: {
    username: string;
    displayName: string;
    roleCode?: string;
    ffn?: string | null;
    instructorLevel?: number | null;
  },
): Promise<{ id: string; username: string }> {
  const [user] = await db
    .insert(users)
    .values({
      username: input.username,
      displayName: input.displayName,
      passwordHash: "fixture-password-hash",
      ffn: input.ffn === undefined ? uniqueFfn() : input.ffn,
      instructorLevel: input.instructorLevel ?? null,
    })
    .returning({ id: users.id, username: users.username });
  if (!user) throw new Error("Staff fixture user was not created.");

  const roleCode = input.roleCode ?? ROLE_CODES.INSTRUCTOR;
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode));
  if (!role) throw new Error(`Role ${roleCode} is missing.`);
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  return user;
}
