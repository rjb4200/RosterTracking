import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import {
  createAgency,
  createCourse,
  createSite,
  createStudent,
  setStudentMembership,
} from "../../src/modules/reference/services";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  auditLogs,
  credentialTypes,
  permissions,
  reportingRequirementSets,
  reportingSystems,
  rolePermissions,
  roles,
  users,
} from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

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

    for (const table of [
      "users",
      "roles",
      "permissions",
      "user_roles",
      "role_permissions",
      "audit_logs",
      "students",
      "agencies",
      "student_agencies",
      "credential_types",
      "student_credentials",
      "reporting_systems",
      "reporting_requirement_sets",
      "reporting_requirements",
      "training_codes",
      "courses",
      "training_sites",
    ]) {
      expect(tables.has(table)).toBe(true);
    }
  });

  it("seeds foundation authorization records idempotently", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });

    await database.transaction(seedFoundation);
    await database.transaction(seedFoundation);

    expect((await database.select().from(roles)).length).toBe(3);
    expect((await database.select().from(permissions)).length).toBe(8);
    expect((await database.select().from(rolePermissions)).length).toBe(17);
  });

  it("seeds reference data idempotently and supports reference CRUD", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });
    await database.transaction(seedReferenceData);
    await database.transaction(seedReferenceData);

    expect((await database.select().from(credentialTypes)).length).toBe(4);
    expect((await database.select().from(reportingSystems)).length).toBe(3);
    expect(
      (await database.select().from(reportingRequirementSets)).length,
    ).toBe(3);

    const suffix = crypto.randomUUID();
    const [actor] = await database
      .insert(users)
      .values({
        username: `reference-test-${suffix}`,
        displayName: "Reference Test",
        passwordHash: "not-a-real-hash",
      })
      .returning({ id: users.id, username: users.username });
    if (!actor) throw new Error("Reference test actor was not created.");

    const agency = await createAgency(database, actor, {
      name: `Agency ${suffix}`,
      type: "Fire",
      address: "",
      city: "",
      state: "",
      zip: "",
    });
    const student = await createStudent(database, actor, {
      firstName: "Reference",
      lastName: "Test",
      phone: `859${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, "0")}`,
      email: "",
      studentNumber: `student-${suffix}`,
    });
    await setStudentMembership(database, actor, student.id, agency.id, {
      isPrimary: true,
      isActive: true,
    });
    const course = await createCourse(database, actor, {
      name: `Course ${suffix}`,
      description: "",
      defaultHours: 8,
      trainingCodeId: "",
    });
    const site = await createSite(database, actor, {
      name: `Site ${suffix}`,
      address: "",
      city: "",
      state: "",
      zip: "",
    });

    expect(agency.id).toBeTruthy();
    expect(student.phone).toMatch(/^\+1/);
    expect(course.id).toBeTruthy();
    expect(site.id).toBeTruthy();
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

    const result = await pool.query("select 1 from users where username = $1", [
      username,
    ]);
    expect(result.rowCount).toBe(0);
  });

  it("rejects audit log mutation", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });
    const [event] = await database
      .insert(auditLogs)
      .values({
        actorType: "system",
        action: "test.created",
        entityType: "test",
      })
      .returning({ id: auditLogs.id });
    if (!event) throw new Error("Audit test event was not inserted.");

    await expect(
      pool.query(
        "update audit_logs set action = 'test.changed' where id = $1",
        [event.id],
      ),
    ).rejects.toThrow(/append-only/);
  });
});
