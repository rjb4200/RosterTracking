import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  compareAppendOnly,
  compareMigrationSet,
  type MigrationRef,
  migrationFileTags,
  parseJournal,
} from "../src/server/db/migration-ledger";

/**
 * Migration set checks. `set` verifies the journal and the migration files
 * agree; `append-only <ref>` verifies that no migration present at <ref> was
 * removed or changed and that new migrations come after it. See the
 * `migration-integrity` capability.
 */

const MIGRATIONS_FOLDER = "drizzle";

function journalTags(): string[] {
  const content = readFileSync(
    join(MIGRATIONS_FOLDER, "meta", "_journal.json"),
    "utf8",
  );
  return parseJournal(content).map((entry) => entry.tag);
}

function sqlRefsFromGit(gitRef: string): MigrationRef[] {
  const output = execFileSync(
    "git",
    ["ls-tree", "-r", "--full-tree", gitRef, "--", MIGRATIONS_FOLDER],
    { encoding: "utf8" },
  );
  return output
    .split("\n")
    .filter((line) => line.endsWith(".sql"))
    .map((line) => {
      const [meta, path] = line.split("\t");
      return {
        hash: meta?.split(/\s+/)[2] ?? "",
        tag:
          (path ?? "")
            .replace(/\.sql$/, "")
            .split("/")
            .pop() ?? "",
      };
    });
}

function checkSet(): void {
  const tags = journalTags();
  const result = compareMigrationSet(
    tags,
    migrationFileTags(MIGRATIONS_FOLDER),
  );
  for (const tag of result.orphanFiles) {
    console.error(`Migration file with no journal entry: ${tag}`);
  }
  for (const tag of result.orphanEntries) {
    console.error(`Journal entry with no migration file: ${tag}`);
  }
  if (result.ok) {
    console.log(`Migration set is consistent (${tags.length} migrations).`);
  } else {
    process.exitCode = 1;
  }
}

function checkAppendOnly(baseRef: string): void {
  const base = sqlRefsFromGit(baseRef);
  const current = sqlRefsFromGit("HEAD");
  const result = compareAppendOnly(base, current);
  for (const tag of result.removedOrChanged) {
    console.error(`Migration removed or changed since ${baseRef}: ${tag}`);
  }
  for (const tag of result.addedBeforeBase) {
    console.error(
      `Migration added before the ${baseRef} frontier (index order): ${tag}`,
    );
  }
  if (result.ok) {
    console.log(`Migrations are append-only relative to ${baseRef}.`);
  } else {
    process.exitCode = 1;
  }
}

const [mode = "set", argument] = process.argv.slice(2);

if (mode === "set") {
  checkSet();
} else if (mode === "append-only") {
  if (!argument) {
    console.error("Usage: check-migrations append-only <git-ref>");
    process.exitCode = 1;
  } else {
    checkAppendOnly(argument);
  }
} else {
  console.error(`Unknown mode '${mode}'. Use 'set' or 'append-only <ref>'.`);
  process.exitCode = 1;
}
