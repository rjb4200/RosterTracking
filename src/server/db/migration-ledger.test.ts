import { describe, expect, it } from "vitest";

import {
  type AppliedMigration,
  compareAppendOnly,
  compareMigrationSet,
  evaluateMigrationStatus,
  hashMigrationSql,
  type JournalMigration,
  parseJournal,
} from "./migration-ledger";

function entry(
  idx: number,
  when: number,
  tag: string,
  hash: string,
): JournalMigration {
  return { idx, when, tag, hash };
}

describe("hashMigrationSql", () => {
  it("is the SHA-256 the migrator stores", () => {
    expect(hashMigrationSql("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("parseJournal", () => {
  it("reads entries", () => {
    const entries = parseJournal(
      JSON.stringify({
        version: "7",
        entries: [{ idx: 0, when: 1, tag: "0000_a" }],
      }),
    );
    expect(entries).toEqual([{ idx: 0, when: 1, tag: "0000_a" }]);
  });
});

describe("compareMigrationSet", () => {
  it("passes when files and entries agree", () => {
    expect(
      compareMigrationSet(["0000_a", "0001_b"], ["0000_a", "0001_b"]),
    ).toEqual({ orphanEntries: [], orphanFiles: [], ok: true });
  });

  it("reports a file with no journal entry", () => {
    const result = compareMigrationSet(["0000_a"], ["0000_a", "0001_b"]);
    expect(result.orphanFiles).toEqual(["0001_b"]);
    expect(result.ok).toBe(false);
  });

  it("reports a journal entry with no file", () => {
    const result = compareMigrationSet(["0000_a", "0001_b"], ["0000_a"]);
    expect(result.orphanEntries).toEqual(["0001_b"]);
    expect(result.ok).toBe(false);
  });
});

describe("compareAppendOnly", () => {
  const base = [
    { tag: "0000_a", hash: "a" },
    { tag: "0005_b", hash: "b" },
  ];

  it("allows appending after the base", () => {
    const result = compareAppendOnly(base, [
      ...base,
      { tag: "0006_c", hash: "c" },
    ]);
    expect(result.ok).toBe(true);
  });

  it("refuses a changed migration", () => {
    const result = compareAppendOnly(base, [
      { tag: "0000_a", hash: "a" },
      { tag: "0005_b", hash: "changed" },
    ]);
    expect(result.removedOrChanged).toEqual(["0005_b"]);
    expect(result.ok).toBe(false);
  });

  it("refuses a removed migration", () => {
    const result = compareAppendOnly(base, [{ tag: "0000_a", hash: "a" }]);
    expect(result.removedOrChanged).toEqual(["0005_b"]);
    expect(result.ok).toBe(false);
  });

  it("flags a migration inserted before the base frontier", () => {
    const result = compareAppendOnly(base, [
      ...base,
      { tag: "0002_x", hash: "x" },
    ]);
    expect(result.addedBeforeBase).toEqual(["0002_x"]);
    expect(result.ok).toBe(false);
  });
});

describe("evaluateMigrationStatus", () => {
  const entries = [
    entry(0, 100, "0000_a", "h0"),
    entry(1, 200, "0001_b", "h1"),
    entry(2, 300, "0002_c", "h2"),
  ];

  it("reports everything pending when nothing is applied", () => {
    const { rows, unmatchedApplied } = evaluateMigrationStatus(entries, []);
    expect(rows.map((row) => row.state)).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    expect(unmatchedApplied).toEqual([]);
  });

  it("marks applied and pending against the frontier", () => {
    const applied: AppliedMigration[] = [
      { createdAt: 100, hash: "h0" },
      { createdAt: 200, hash: "h1" },
    ];
    const { rows } = evaluateMigrationStatus(entries, applied);
    expect(rows.map((row) => row.state)).toEqual([
      "applied",
      "applied",
      "pending",
    ]);
  });

  it("marks a ledger that skipped an in-order migration", () => {
    const applied: AppliedMigration[] = [
      { createdAt: 100, hash: "h0" },
      { createdAt: 300, hash: "h2" },
    ];
    const { rows } = evaluateMigrationStatus(entries, applied);
    expect(rows.map((row) => row.state)).toEqual([
      "applied",
      "skipped",
      "applied",
    ]);
  });

  it("marks a migration whose file changed after it was applied", () => {
    const { rows } = evaluateMigrationStatus(entries, [
      { createdAt: 100, hash: "different" },
    ]);
    expect(rows[0]?.state).toBe("edited");
  });

  it("surfaces an applied row with no committed migration", () => {
    const { unmatchedApplied } = evaluateMigrationStatus(entries, [
      { createdAt: 999, hash: "orphan" },
    ]);
    expect(unmatchedApplied).toEqual([{ createdAt: 999, hash: "orphan" }]);
  });
});
