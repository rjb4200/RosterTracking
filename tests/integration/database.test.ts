import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { CLASS_STATUSES } from "../../src/modules/classes/constants";
import {
  assignClassInstructor,
  createClassDraft,
  resolveOpenClassPublicCode,
  resolveOpenClassToken,
  rotateClassSignInToken,
  saveClassComponent,
  transitionClass,
  updateClassDraft,
} from "../../src/modules/classes/services";
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
  classComponents,
  classInstructors,
  classReportingSystems,
  courseReportingDefaults,
  courses,
  credentialTypes,
  permissions,
  reportingRequirementSets,
  reportingSystems,
  rolePermissions,
  roles,
  trainingClasses,
  trainingSites,
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
      "classes",
      "class_components",
      "class_instructors",
      "class_reporting_systems",
      "remembered_devices",
      "public_rate_limit_windows",
      "sign_in_workflow_staging",
      "class_guests",
      "attendance",
      "attendance_attestations",
      "attendance_reporting_contexts",
      "attendance_required_field_snapshots",
      "attendance_credential_snapshots",
      "finalization_revisions",
      "finalization_reopens",
      "finalization_reporting_statuses",
    ]) {
      expect(tables.has(table)).toBe(true);
    }
    expect(tables.has("official_roster_artifacts")).toBe(false);
  });

  it("seeds foundation authorization records idempotently", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });

    await database.transaction(seedFoundation);
    await database.transaction(seedFoundation);

    expect((await database.select().from(roles)).length).toBe(3);
    expect((await database.select().from(permissions)).length).toBe(10);
    expect((await database.select().from(rolePermissions)).length).toBe(22);
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

  it("creates, opens, and rotates access for a class aggregate", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });
    await database.transaction(seedReferenceData);
    const suffix = crypto.randomUUID();
    const [actor] = await database
      .insert(users)
      .values({
        username: `class-test-${suffix}`,
        displayName: "Class Test",
        passwordHash: "not-a-real-hash",
      })
      .returning({ id: users.id, username: users.username });
    const [course] = await database
      .insert(courses)
      .values({ name: `Class Course ${suffix}` })
      .returning();
    const [site] = await database
      .insert(trainingSites)
      .values({ name: `Class Site ${suffix}` })
      .returning();
    const [system] = await database.select().from(reportingSystems).limit(1);
    if (!actor || !course || !site || !system) {
      throw new Error("Class integration fixtures were not created.");
    }

    await database.insert(courseReportingDefaults).values({
      courseId: course.id,
      reportingSystemId: system.id,
    });
    const created = await createClassDraft(database, actor, {
      courseId: course.id,
      trainingSiteId: site.id,
      deliveryMethod: "in_person",
    });
    await expect(
      transitionClass(
        database,
        actor,
        created.classRecord.id,
        CLASS_STATUSES.OPEN,
      ),
    ).rejects.toThrow(/component/i);
    await updateClassDraft(database, actor, created.classRecord.id, {
      courseId: course.id,
      trainingSiteId: site.id,
      deliveryMethod: "hybrid",
      reportingSystemIds: [system.id],
    });
    const [replacementLead] = await database
      .insert(users)
      .values({
        username: `class-lead-${suffix}`,
        displayName: "Replacement Lead",
        passwordHash: "not-a-real-hash",
      })
      .returning({ id: users.id });
    if (!replacementLead) throw new Error("Replacement lead was not created.");
    await assignClassInstructor(
      database,
      actor,
      created.classRecord.id,
      replacementLead.id,
      true,
    );
    const component = await saveClassComponent(
      database,
      actor,
      created.classRecord.id,
      {
        title: "Session one",
        startsAt: "2026-09-10T13:00:00Z",
        creditedHours: 4,
        position: 0,
      },
    );
    await saveClassComponent(database, actor, created.classRecord.id, {
      id: component.id,
      title: "Updated session",
      startsAt: "2026-09-10T13:00:00Z",
      creditedHours: 4,
      position: 0,
    });
    await transitionClass(
      database,
      actor,
      created.classRecord.id,
      CLASS_STATUSES.OPEN,
    );
    expect(
      await resolveOpenClassToken(database, created.rawToken),
    ).toMatchObject({ id: created.classRecord.id });
    expect(
      await resolveOpenClassPublicCode(
        database,
        created.classRecord.publicCode ?? "",
      ),
    ).toMatchObject({ id: created.classRecord.id });

    const rotated = await rotateClassSignInToken(
      database,
      actor,
      created.classRecord.id,
    );
    expect(await resolveOpenClassToken(database, created.rawToken)).toBeNull();
    expect(await resolveOpenClassToken(database, rotated)).toMatchObject({
      id: created.classRecord.id,
    });
    expect(
      await resolveOpenClassPublicCode(
        database,
        created.classRecord.publicCode ?? "",
      ),
    ).toMatchObject({ id: created.classRecord.id });
    await expect(
      transitionClass(
        database,
        actor,
        created.classRecord.id,
        CLASS_STATUSES.FINALIZED,
      ),
    ).rejects.toThrow(/cannot transition/i);
    await expect(
      transitionClass(
        database,
        actor,
        created.classRecord.id,
        CLASS_STATUSES.COMPLETED,
      ),
    ).rejects.toThrow(/active attendance/i);
    expect(await resolveOpenClassToken(database, rotated)).toMatchObject({
      id: created.classRecord.id,
    });
    expect(
      (
        await database
          .select()
          .from(classComponents)
          .where(eq(classComponents.classId, created.classRecord.id))
      ).length,
    ).toBe(1);
    expect(
      (
        await database
          .select()
          .from(classInstructors)
          .where(
            and(
              eq(classInstructors.classId, created.classRecord.id),
              eq(classInstructors.isLead, true),
            ),
          )
      ).length,
    ).toBe(1);
    expect(
      (
        await database
          .select()
          .from(classInstructors)
          .where(eq(classInstructors.classId, created.classRecord.id))
      ).length,
    ).toBe(2);
    expect(
      (
        await database
          .select()
          .from(classReportingSystems)
          .where(eq(classReportingSystems.classId, created.classRecord.id))
      ).length,
    ).toBe(1);
    expect(
      (
        await database
          .select()
          .from(trainingClasses)
          .where(eq(trainingClasses.id, created.classRecord.id))
      )[0]?.status,
    ).toBe(CLASS_STATUSES.OPEN);
    const classAuditActions = (
      await database
        .select({ action: auditLogs.action })
        .from(auditLogs)
        .where(eq(auditLogs.entityId, created.classRecord.id))
    ).map(({ action }) => action);
    expect(classAuditActions).toEqual(
      expect.arrayContaining([
        "class.created",
        "class.reporting_systems.changed",
        "class.component.saved",
        "class.instructor.assigned",
        "class.status.changed",
        "class.sign_in.rotated",
      ]),
    );
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
