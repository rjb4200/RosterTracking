import "dotenv/config";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { z } from "zod";

import { hashPassword } from "../src/modules/staff-auth/password";
import type { Database } from "../src/server/db/client";
import { assertNotProtectedTarget } from "../src/server/db/maintenance-guard";
import {
  importReferenceData,
  readReferenceSources,
} from "../src/server/db/reference-provision";
import { seedReferenceData } from "../src/server/db/reference-seed";
import * as schema from "../src/server/db/schema";
import { users } from "../src/server/db/schema";
import { seedFoundation } from "../src/server/db/seed";

const databaseUrl = z.string().url().startsWith("postgresql://");

const PRODUCTION_DATABASE_NAME = "RosterGenerator";

/** A stable, non-login account used only to attribute reference imports. */
const IMPORT_ACTOR_USERNAME = "reference-import";

function requiredUrl(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return databaseUrl.parse(value);
}

function resolveTarget(): { label: string; url: string } {
  const args = process.argv.slice(2);
  const urlArg = args
    .find((argument) => argument.startsWith("--url="))
    ?.slice("--url=".length);
  const databaseArg = args
    .find((argument) => argument.startsWith("--database="))
    ?.slice("--database=".length);

  if (urlArg) return { label: "custom", url: databaseUrl.parse(urlArg) };
  if (databaseArg === "integration") {
    return { label: "integration", url: requiredUrl("TEST_DATABASE_URL") };
  }
  if (databaseArg === "e2e") {
    return { label: "e2e", url: requiredUrl("E2E_DATABASE_URL") };
  }

  throw new Error(
    "Provide --database=integration, --database=e2e, or --url=<connection string>. Refusing to guess a database.",
  );
}

function assertNotProduction(target: string): void {
  const parsed = new URL(target);
  const databaseName = parsed.pathname.replace(/^\//, "");

  if (databaseName === PRODUCTION_DATABASE_NAME) {
    throw new Error(
      `Refusing to reset the production database "${databaseName}".`,
    );
  }

  for (const name of ["DATABASE_URL", "DATABASE_URL_DIRECT"]) {
    const productionValue = process.env[name];
    if (!productionValue) continue;
    const production = new URL(productionValue);
    if (
      production.hostname === parsed.hostname &&
      production.pathname === parsed.pathname
    ) {
      throw new Error(`Refusing to reset a database that matches ${name}.`);
    }
  }
}

async function warmUp(pool: Pool): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      console.warn("Database wake-up failed; retrying once.");
    }
  }
}

async function clearApplicationTables(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public'",
  );
  if (!rows.length) return;
  const tables = rows
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(", ");
  await pool.query(`truncate table ${tables} restart identity cascade`);
}

/**
 * The reference imports write audit rows attributed to an actor, so a test
 * database needs one account before it can be populated from committed sources.
 */
async function ensureImportActor(
  db: Database,
): Promise<{ id: string; username: string }> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, IMPORT_ACTOR_USERNAME))
    .limit(1);
  if (existing) return { id: existing.id, username: IMPORT_ACTOR_USERNAME };

  const passwordHash = await hashPassword(
    randomBytes(24).toString("base64url"),
  );
  const [created] = await db
    .insert(users)
    .values({
      username: IMPORT_ACTOR_USERNAME,
      displayName: "Reference Import",
      passwordHash,
    })
    .returning({ id: users.id });
  if (!created) throw new Error("Import actor was not created.");
  return { id: created.id, username: IMPORT_ACTOR_USERNAME };
}

const target = resolveTarget();
assertNotProduction(target.url);
assertNotProtectedTarget(target.url, "db:reset");

const pool = new Pool({ connectionString: target.url, max: 1 });
const db = drizzle(pool, { schema });

try {
  await warmUp(pool);
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await clearApplicationTables(pool);
  await db.transaction(async (transaction) => {
    await seedFoundation(transaction);
    await seedReferenceData(transaction);
  });

  const actor = await ensureImportActor(db);
  const sources = await readReferenceSources("scripts/data");
  const result = await importReferenceData(db, actor, sources);

  console.log(
    `Reset the ${target.label} database: migrations applied, application tables cleared, ` +
      `seeds loaded, reference imported (curricula=${result.curricula} chapters=${result.chapters} ` +
      `trainingCodes=${result.codes} mtu=${result.mtu}).`,
  );
} finally {
  await pool.end();
}
