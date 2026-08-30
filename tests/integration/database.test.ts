import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";

import { seedFoundation } from "../../src/server/db/seed";
import { auditLogs, permissions, rolePermissions, roles } from "../../src/server/db/schema";
import * as schema from "../../src/server/db/schema";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString ? new Pool({ connectionString, max: 1 }) : undefined;

afterAll(async () => {
  await pool?.end();
});

describeDatabase("database foundation", () => {
  it("applies migrations repeatedly and creates the expected tables", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });

    await migrate(database, { migrationsFolder: "drizzle" });
    await migrate(database, { migrationsFolder: "drizzle" });

    const result = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const tables = new Set(result.rows.map(({ table_name }) => table_name));

    for (const table of ["users", "roles", "permissions", "user_roles", "role_permissions", "audit_logs"]) {
      expect(tables.has(table)).toBe(true);
    }
  });

  it("seeds foundation authorization records idempotently", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });

    await database.transaction(seedFoundation);
    await database.transaction(seedFoundation);

    expect((await database.select().from(roles)).length).toBe(2);
    expect((await database.select().from(permissions)).length).toBe(2);
    expect((await database.select().from(rolePermissions)).length).toBe(3);
  });

  it("rolls back a failed transaction", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const client = await pool.connect();
    const username = `rollback-${crypto.randomUUID()}`;

    try {
      await client.query("begin");
      await client.query(
        "insert into users (username, display_name, password_hash) values ($1, $2, $3)",
        [username, "Rollback Test", "not-a-real-hash"],
      );
      await client.query("rollback");
    } finally {
      client.release();
    }

    const result = await pool.query("select 1 from users where username = $1", [username]);
    expect(result.rowCount).toBe(0);
  });

  it("rejects audit log mutation", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });
    const [event] = await database
      .insert(auditLogs)
      .values({ actorType: "system", action: "test.created", entityType: "test" })
      .returning({ id: auditLogs.id });
    if (!event) throw new Error("Audit test event was not inserted.");

    await expect(pool.query("update audit_logs set action = 'test.changed' where id = $1", [event.id])).rejects.toThrow(
      /append-only/,
    );
  });
});
