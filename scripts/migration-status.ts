import "dotenv/config";

import { Pool } from "pg";
import { z } from "zod";

import { assertNotProtectedTarget } from "../src/server/db/maintenance-guard";
import {
  type AppliedMigration,
  evaluateMigrationStatus,
  type MigrationState,
  readJournalMigrations,
} from "../src/server/db/migration-ledger";

/**
 * Read-only migration status: compares a target database's applied ledger to the
 * committed migration set and reports what is pending, skipped, or edited. It
 * writes nothing. See the `migration-integrity` capability.
 */

const MIGRATIONS_FOLDER = "drizzle";

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
assertNotProtectedTarget(directUrl, "db:status");

const pool = new Pool({ connectionString: directUrl, max: 1 });

try {
  const committed = readJournalMigrations(MIGRATIONS_FOLDER);

  const ledger = await pool.query<{ reg: string | null }>(
    "select to_regclass('drizzle.__drizzle_migrations')::text as reg",
  );
  const applied: AppliedMigration[] = ledger.rows[0]?.reg
    ? (
        await pool.query<{ hash: string; created_at: string }>(
          "select hash, created_at from drizzle.__drizzle_migrations order by created_at",
        )
      ).rows.map((row) => ({
        createdAt: Number(row.created_at),
        hash: row.hash,
      }))
    : [];

  const { rows, unmatchedApplied } = evaluateMigrationStatus(
    committed,
    applied,
  );
  const inState = (state: MigrationState) =>
    rows.filter((row) => row.state === state);

  console.log(
    `${committed.length} committed migrations, ${applied.length} applied in the ledger.`,
  );
  for (const state of ["applied", "pending", "skipped", "edited"] as const) {
    const list = inState(state);
    console.log(`${state}: ${list.length}`);
    if (state !== "applied") {
      for (const row of list) console.log(`  ${row.tag}`);
    }
  }
  if (unmatchedApplied.length > 0) {
    console.log(`applied but not committed: ${unmatchedApplied.length}`);
    for (const row of unmatchedApplied) {
      console.log(`  created_at=${row.createdAt}`);
    }
  }

  const clean =
    inState("pending").length === 0 &&
    inState("skipped").length === 0 &&
    inState("edited").length === 0 &&
    unmatchedApplied.length === 0;

  if (clean) {
    console.log("In sync.");
  } else {
    console.error(
      "Migration ledger is not in sync with the committed migration set.",
    );
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
