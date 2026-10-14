import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Pure helpers behind `db:status` and `check:migrations`.
 *
 * The applied-migration logic mirrors drizzle-orm's Postgres migrator
 * (`node_modules/drizzle-orm/pg-core/dialect.js`): the ledger records each
 * applied migration's `when` as `created_at`, and the migrator applies every
 * journal entry whose `when` is strictly greater than the greatest recorded
 * `created_at`. A journal entry whose `when` is not greater is skipped, which
 * is why a status check must compare by entry, not by count.
 *
 * See the `migration-integrity` capability.
 */

export interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

export interface JournalMigration extends JournalEntry {
  /** SHA-256 of the migration file, matching what the migrator stores. */
  hash: string;
}

export interface AppliedMigration {
  /** The ledger's `created_at`, which equals the applied migration's `when`. */
  createdAt: number;
  hash: string;
}

export type MigrationState = "applied" | "pending" | "skipped" | "edited";

export interface MigrationStatusRow {
  idx: number;
  when: number;
  tag: string;
  state: MigrationState;
}

export interface MigrationRef {
  tag: string;
  hash: string;
}

export function hashMigrationSql(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export function parseJournal(content: string): JournalEntry[] {
  const parsed = JSON.parse(content) as { entries?: JournalEntry[] };
  return (parsed.entries ?? []).map((entry) => ({
    idx: entry.idx,
    when: entry.when,
    tag: entry.tag,
  }));
}

/** Reads the journal and hashes each migration file it lists. */
export function readJournalMigrations(folder: string): JournalMigration[] {
  const journalPath = join(folder, "meta", "_journal.json");
  const entries = parseJournal(readFileSync(journalPath, "utf8"));
  return entries.map((entry) => {
    const sql = readFileSync(join(folder, `${entry.tag}.sql`), "utf8");
    return { ...entry, hash: hashMigrationSql(sql) };
  });
}

/** Migration tags present as files in the folder, matched by the journal's naming. */
export function migrationFileTags(folder: string): string[] {
  return readdirSync(folder)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .map((name) => name.replace(/\.sql$/, ""));
}

export function compareMigrationSet(
  journalTags: string[],
  fileTags: string[],
): { orphanEntries: string[]; orphanFiles: string[]; ok: boolean } {
  const journal = new Set(journalTags);
  const files = new Set(fileTags);
  const orphanEntries = journalTags.filter((tag) => !files.has(tag));
  const orphanFiles = fileTags.filter((tag) => !journal.has(tag));
  return {
    orphanEntries,
    orphanFiles,
    ok: orphanEntries.length === 0 && orphanFiles.length === 0,
  };
}

function tagIndex(tag: string): number {
  const match = /^(\d+)/.exec(tag);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

/** Append-only comparison: a base migration must remain present and unchanged. */
export function compareAppendOnly(
  base: MigrationRef[],
  current: MigrationRef[],
): { removedOrChanged: string[]; addedBeforeBase: string[]; ok: boolean } {
  const currentByTag = new Map(current.map((ref) => [ref.tag, ref.hash]));
  const removedOrChanged = base
    .filter((ref) => currentByTag.get(ref.tag) !== ref.hash)
    .map((ref) => ref.tag);

  const baseTags = new Set(base.map((ref) => ref.tag));
  const maxBaseIndex = base.reduce(
    (max, ref) => Math.max(max, tagIndex(ref.tag)),
    -1,
  );
  const addedBeforeBase = current
    .filter(
      (ref) => !baseTags.has(ref.tag) && tagIndex(ref.tag) <= maxBaseIndex,
    )
    .map((ref) => ref.tag);

  return {
    removedOrChanged,
    addedBeforeBase,
    ok: removedOrChanged.length === 0 && addedBeforeBase.length === 0,
  };
}

/**
 * Classifies each committed migration against the applied ledger. Returns the
 * per-entry status plus any applied rows that match no committed migration.
 */
export function evaluateMigrationStatus(
  entries: JournalMigration[],
  applied: AppliedMigration[],
): { rows: MigrationStatusRow[]; unmatchedApplied: AppliedMigration[] } {
  const appliedByWhen = new Map(
    applied.map((row) => [row.createdAt, row.hash]),
  );
  const maxApplied =
    applied.length > 0
      ? Math.max(...applied.map((row) => row.createdAt))
      : null;

  const rows = entries.map((entry) => {
    let state: MigrationState;
    if (maxApplied === null || entry.when > maxApplied) {
      state = "pending";
    } else {
      const appliedHash = appliedByWhen.get(entry.when);
      if (appliedHash === undefined) state = "skipped";
      else if (appliedHash === entry.hash) state = "applied";
      else state = "edited";
    }
    return { idx: entry.idx, when: entry.when, tag: entry.tag, state };
  });

  const journalWhens = new Set(entries.map((entry) => entry.when));
  const unmatchedApplied = applied.filter(
    (row) => !journalWhens.has(row.createdAt),
  );

  return { rows, unmatchedApplied };
}
