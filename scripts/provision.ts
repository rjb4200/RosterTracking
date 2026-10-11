import "dotenv/config";

import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { z } from "zod";

import {
  hashPassword,
  normalizeUsername,
} from "../src/modules/staff-auth/password";
import { ROLE_CODES } from "../src/modules/staff-auth/permissions";
import { assertNotProtectedTarget } from "../src/server/db/maintenance-guard";
import {
  importReferenceData,
  readReferenceSources,
} from "../src/server/db/reference-provision";
import { seedReferenceData } from "../src/server/db/reference-seed";
import * as schema from "../src/server/db/schema";
import { auditLogs, roles, userRoles, users } from "../src/server/db/schema";
import { seedFoundation } from "../src/server/db/seed";

/**
 * Build a fresh database from committed sources: migrations, the foundation and
 * reference seeds, the committed reference imports, and the administrator.
 *
 * This command never reads or modifies another database, and never deletes
 * rows. Re-running it is idempotent. It refuses a protected (production)
 * database unless `--allow-production` is passed.
 *
 * See the `database-provisioning` capability.
 */

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
assertNotProtectedTarget(directUrl, "provision");

const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

async function ensureAdministrator(): Promise<{
  id: string;
  username: string;
}> {
  const username = normalizeUsername(process.env.ADMIN_USERNAME ?? "");
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || password.length === 0) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD are required to provision the administrator.",
    );
  }
  const displayName =
    (process.env.ADMIN_DISPLAY_NAME ?? username).trim() || username;
  const passwordHash = await hashPassword(password);

  return db.transaction(async (transaction) => {
    const [role] = await transaction
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(eq(roles.code, ROLE_CODES.ADMINISTRATOR), eq(roles.isActive, true)),
      )
      .limit(1);
    if (!role) {
      throw new Error(
        "The Administrator role is missing; the foundation seed must run first.",
      );
    }
    const [user] = await transaction
      .insert(users)
      .values({ username, displayName, passwordHash })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          displayName,
          passwordHash,
          isActive: true,
          failedLoginCount: 0,
          lockedUntil: null,
          sessionVersion: sql`${users.sessionVersion} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id });
    if (!user) throw new Error("Administrator account was not created.");
    await transaction
      .insert(userRoles)
      .values({ userId: user.id, roleId: role.id })
      .onConflictDoNothing();
    await transaction.insert(auditLogs).values({
      actorType: "system",
      action: "staff.account.created",
      entityType: "user",
      entityId: user.id,
      details: { username, source: "provision" },
    });
    return { id: user.id, username };
  });
}

try {
  console.log(
    "Provisioning from committed sources (target-only, non-destructive).",
  );

  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  console.log("  migrations applied");

  await db.transaction(async (transaction) => {
    await seedFoundation(transaction);
    await seedReferenceData(transaction);
  });
  console.log("  foundation and reference seeds applied");

  const actor = await ensureAdministrator();
  console.log(`  administrator ready (${actor.username})`);

  const sources = await readReferenceSources("scripts/data");
  const result = await importReferenceData(db, actor, sources);
  console.log(
    `  imported curricula=${result.curricula} chapters=${result.chapters} trainingCodes=${result.codes} mtuInserted=${result.mtu}`,
  );

  console.log("Provisioning complete.");
} finally {
  await pool.end();
}
