import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { expect, it } from "vitest";

it("backfills the assistant without inventing a legacy lead, and enforces distinct official roles", async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.startsWith("/roster_integration")) {
    throw new Error(
      "This migration test requires the isolated integration database.",
    );
  }
  const migration = await readFile(
    new URL("../../drizzle/0056_nifty_cardiac.sql", import.meta.url),
    "utf8",
  );
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query(`
      CREATE TEMP TABLE classes (id integer PRIMARY KEY, status text);
      CREATE TEMP TABLE class_instructors (
        class_id integer NOT NULL, user_id integer NOT NULL,
        is_lead boolean NOT NULL, PRIMARY KEY (class_id, user_id)
      );
      INSERT INTO classes VALUES (1, 'open'), (2, 'finalized');
      INSERT INTO class_instructors VALUES (1, 1, true), (1, 2, false);
    `);
    await db.query(migration);
    expect(
      (await db.query("SELECT * FROM class_instructors ORDER BY user_id")).rows,
    ).toEqual([
      { class_id: 1, user_id: 1, is_lead: true, is_assistant: false },
      { class_id: 1, user_id: 2, is_lead: false, is_assistant: true },
    ]);
    await db.query("INSERT INTO class_instructors VALUES (1, 3, false, false)");
    await db.query("SAVEPOINT roles");
    await expect(
      db.query(
        "UPDATE class_instructors SET is_assistant = true WHERE user_id = 1",
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await db.query("ROLLBACK TO SAVEPOINT roles");
    await expect(
      db.query(
        "UPDATE class_instructors SET is_assistant = true WHERE user_id = 3",
      ),
    ).rejects.toMatchObject({ code: "23505" });
  } finally {
    await db.end();
  }
});
