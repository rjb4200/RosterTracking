import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { CLASS_STATUSES } from "../../src/modules/classes/constants";
import { finalizeClass } from "../../src/modules/classes/finalization";
import {
  assignClassInstructor,
  createOpenClass,
  listClassFormOptions,
  listOperationalClasses,
  resolveOpenClassPublicCode,
  resolveOpenClassToken,
  rotateClassSignInToken,
  saveClassComponent,
  transitionClass,
  updateClass,
} from "../../src/modules/classes/services";
import {
  createAgency,
  createSite,
  createStudent,
  setStudentMembership,
} from "../../src/modules/reference/services";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  auditLogs,
  classComponents,
  classInstructors,
  classReportingSystems,
  credentialTypes,
  permissions,
  reportingRequirementSets,
  reportingSystems,
  rolePermissions,
  roles,
  trainingClasses,
  trainingSites,
  userRoles,
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
    expect(tables.has("courses")).toBe(false);
    expect(tables.has("course_reporting_defaults")).toBe(false);
    expect(tables.has("official_roster_artifacts")).toBe(false);
  });

  it("seeds foundation authorization records idempotently", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });

    await database.transaction(seedFoundation);
    await database.transaction(seedFoundation);

    expect((await database.select().from(roles)).length).toBe(3);
    expect((await database.select().from(permissions)).length).toBe(11);
    expect((await database.select().from(rolePermissions)).length).toBe(25);
  });

  it("seeds reference data idempotently and supports reference CRUD", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });
    await database.transaction(seedReferenceData);
    await database.transaction(seedReferenceData);

    expect((await database.select().from(credentialTypes)).length).toBe(4);
    // fire, kbems, mtu, and the deactivated fema row are all retained.
    expect((await database.select().from(reportingSystems)).length).toBe(4);
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
    const site = await createSite(database, actor, {
      name: `Site ${suffix}`,
      address: "",
      city: "",
      state: "",
      zip: "",
    });

    expect(agency.id).toBeTruthy();
    expect(student.phone).toMatch(/^\+1/);
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
    const [site] = await database
      .insert(trainingSites)
      .values({ name: `Class Site ${suffix}` })
      .returning();
    const [agency] = await database
      .insert(agencies)
      .values({ name: `Class Agency ${suffix}` })
      .returning({ id: agencies.id });
    const [system] = await database.select().from(reportingSystems).limit(1);
    if (!actor || !site || !agency || !system) {
      throw new Error("Class integration fixtures were not created.");
    }

    const created = await createOpenClass(database, actor, {
      name: `Class Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      deliveryMethod: "classroom",
      startsAt: "2026-09-10T13:00:00Z",
      creditedHours: 4,
      leadInstructorId: actor.id,
    });
    await updateClass(database, actor, created.classRecord.id, {
      name: `Class Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
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
    await expect(
      saveClassComponent(database, actor, created.classRecord.id, {
        title: "Different roster day",
        startsAt: "2026-09-11T13:00:00Z",
        creditedHours: 4,
        position: 1,
      }),
    ).rejects.toThrow(/one roster day/i);
    // A start time near midnight rounds to the next day, which must still be
    // rejected by the single-roster-day rule rather than silently accepted.
    await expect(
      saveClassComponent(database, actor, created.classRecord.id, {
        title: "Rounds into the next roster day",
        startsAt: "2026-09-11T03:53:00Z",
        creditedHours: 4,
        position: 2,
      }),
    ).rejects.toThrow(/one roster day/i);
    await saveClassComponent(database, actor, created.classRecord.id, {
      id: component.id,
      title: "Updated session",
      startsAt: "2026-09-10T13:00:00Z",
      creditedHours: 4,
      position: 0,
    });
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
    ).toBe(2);
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

    // Completing no longer depends on roster readiness. It closes public
    // sign-in and enters roster review, where corrections are made.
    await transitionClass(
      database,
      actor,
      created.classRecord.id,
      CLASS_STATUSES.COMPLETED,
    );
    expect(await resolveOpenClassToken(database, rotated)).toBeNull();
    expect(
      await resolveOpenClassPublicCode(
        database,
        created.classRecord.publicCode ?? "",
      ),
    ).toBeNull();
    expect(
      (
        await database
          .select()
          .from(trainingClasses)
          .where(eq(trainingClasses.id, created.classRecord.id))
      )[0]?.status,
    ).toBe(CLASS_STATUSES.COMPLETED);

    // Readiness still gates the irreversible step.
    await expect(
      finalizeClass(database, actor, created.classRecord.id),
    ).rejects.toThrow(/active attendance/i);

    // Class details, sessions, and instructors stay editable while the class
    // is under completed review.
    await updateClass(database, actor, created.classRecord.id, {
      name: `Class Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      deliveryMethod: "hybrid",
      reportingSystemIds: [system.id],
    });
    await saveClassComponent(database, actor, created.classRecord.id, {
      id: component.id,
      title: "Corrected session",
      startsAt: "2026-09-10T13:00:00Z",
      creditedHours: 3,
      position: 0,
    });
    expect(
      (
        await database
          .select()
          .from(classComponents)
          .where(eq(classComponents.id, component.id))
      )[0]?.creditedHours,
    ).toBe("3.00");
    await assignClassInstructor(
      database,
      actor,
      created.classRecord.id,
      replacementLead.id,
      true,
    );

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

  it("creates the initial scheduled class aggregate atomically", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });
    await database.transaction(seedReferenceData);
    const suffix = crypto.randomUUID();
    const [actor] = await database
      .insert(users)
      .values({
        username: `scheduled-class-${suffix}`,
        displayName: "Scheduled Class Instructor",
        passwordHash: "not-a-real-hash",
      })
      .returning({ id: users.id, username: users.username });
    const [site] = await database
      .insert(trainingSites)
      .values({ name: `Scheduled Class Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const [agency] = await database
      .insert(agencies)
      .values({ name: `Scheduled Class Agency ${suffix}` })
      .returning({ id: agencies.id });
    if (!actor || !site || !agency)
      throw new Error("Scheduled fixtures missing.");
    const [system] = await database
      .select({ id: reportingSystems.id })
      .from(reportingSystems)
      .limit(1);
    if (!system) throw new Error("Reporting system fixture missing.");

    const created = await createOpenClass(database, actor, {
      name: `Scheduled Class Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      deliveryMethod: "classroom",
      reportingSystemIds: [system.id],
      startsAt: "2026-09-10T09:00:00Z",
      creditedHours: 4,
      leadInstructorId: actor.id,
    });
    const components = await database
      .select()
      .from(classComponents)
      .where(eq(classComponents.classId, created.classRecord.id));
    const instructors = await database
      .select()
      .from(classInstructors)
      .where(eq(classInstructors.classId, created.classRecord.id));
    expect(components).toHaveLength(1);
    expect(instructors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: actor.id, isLead: true }),
      ]),
    );
    const options = await listClassFormOptions(database, actor);
    expect(options.recentSiteIds).toContain(site.id);
    expect(options.reportingRequirements.length).toBeGreaterThan(0);

    const classCount = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(trainingClasses);
    await expect(
      createOpenClass(database, actor, {
        name: `Scheduled Class Course ${suffix}`,
        trainingSiteId: site.id,
        hostAgencyId: agency.id,
        deliveryMethod: "classroom",
        startsAt: "2026-09-10T09:00:00Z",
        creditedHours: 4,
        leadInstructorId: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/lead instructor/i);
    const classCountAfterFailure = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(trainingClasses);
    expect(classCountAfterFailure[0]?.count).toBe(classCount[0]?.count);
  });

  it("limits teaching dashboards to assignments while elevated staff see department work", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const database = drizzle(pool, { schema });
    await database.transaction(seedFoundation);
    await database.transaction(seedReferenceData);
    const suffix = crypto.randomUUID();
    const [instructor, colleague, elevated] = await database
      .insert(users)
      .values([
        {
          username: `dashboard-instructor-${suffix}`,
          displayName: "Dashboard Instructor",
          passwordHash: "not-a-real-hash",
        },
        {
          username: `dashboard-colleague-${suffix}`,
          displayName: "Dashboard Colleague",
          passwordHash: "not-a-real-hash",
        },
        {
          username: `dashboard-major-${suffix}`,
          displayName: "Dashboard Major",
          passwordHash: "not-a-real-hash",
        },
      ])
      .returning({ id: users.id, username: users.username });
    const [site] = await database
      .insert(trainingSites)
      .values({ name: `Dashboard Site ${suffix}` })
      .returning({ id: trainingSites.id });
    const [agency] = await database
      .insert(agencies)
      .values({ name: `Dashboard Agency ${suffix}` })
      .returning({ id: agencies.id });
    const [system] = await database.select().from(reportingSystems).limit(1);
    const [trainingMajor] = await database
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, "training-major"))
      .limit(1);
    if (
      !instructor ||
      !colleague ||
      !elevated ||
      !site ||
      !agency ||
      !system ||
      !trainingMajor
    ) {
      throw new Error("Dashboard integration fixtures were not created.");
    }
    await database
      .insert(userRoles)
      .values({ userId: elevated.id, roleId: trainingMajor.id });
    const created = await createOpenClass(database, instructor, {
      name: `Dashboard Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      deliveryMethod: "classroom",
      reportingSystemIds: [system.id],
      startsAt: "2026-09-10T08:00:00Z",
      creditedHours: 4,
      leadInstructorId: instructor.id,
    });
    await assignClassInstructor(
      database,
      instructor,
      created.classRecord.id,
      colleague.id,
      false,
    );

    const now = new Date("2026-09-12T12:00:01Z");
    const colleagueClasses = await listOperationalClasses(
      database,
      colleague,
      "assigned",
      now,
    );
    const instructorClasses = await listOperationalClasses(
      database,
      instructor,
      "assigned",
      now,
    );
    const elevatedClasses = await listOperationalClasses(
      database,
      elevated,
      "department",
      now,
    );

    expect(colleagueClasses).toMatchObject([
      { id: created.classRecord.id, isOverdue: true, action: "roster" },
    ]);
    expect(instructorClasses).toMatchObject([{ id: created.classRecord.id }]);
    expect(
      elevatedClasses.find(
        (classRecord) => classRecord.id === created.classRecord.id,
      ),
    ).toMatchObject({ reportingDestinations: [system.name] });
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
