import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { finalizeClass } from "../../src/modules/classes/finalization";
import { hashClassSignInToken } from "../../src/modules/classes/token";
import {
  correctCredential,
  listClassCredentialCorrections,
} from "../../src/modules/credential-correction/service";
import {
  credentialLookupHash,
  decryptCredential,
  encryptCredential,
} from "../../src/modules/reference/crypto";
import { credentialMaskedSuffix } from "../../src/modules/reference/masking";
import { confirmAttendance } from "../../src/modules/student-sign-in/attendance";
import { stageRegularRequirements } from "../../src/modules/student-sign-in/participants";
import { createWorkflowFromClassToken } from "../../src/modules/student-sign-in/workflow";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceCredentialSnapshots,
  attendanceReportingContexts,
  classComponents,
  classInstructors,
  classReportingSystems,
  credentialTypes,
  finalizationReportingStatuses,
  finalizationRevisions,
  reportingRequirementSets,
  reportingSystems,
  studentCredentials,
  students,
  trainingClasses,
  trainingSites,
  users,
} from "../../src/server/db/schema";
import { uniqueFfn } from "./support/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

const request = {
  ipAddress: "203.0.113.10",
  requestSourceFingerprint: "test-source-fingerprint",
  requestCorrelationId: "test-correlation-id",
};

beforeAll(async () => {
  vi.stubEnv("AUTH_SECRET", "integration-auth-secret-at-least-32-characters");
  vi.stubEnv(
    "CREDENTIAL_ENCRYPTION_KEY",
    "WfAtPIckXdR1AkTmkBZOPGTns2gUyVLExMfK/1islVM=",
  );
  if (!pool) return;
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.transaction(seedReferenceData);
});

afterAll(async () => {
  await pool?.end();
});

async function fireIds(db: Db) {
  const [ffn] = await db
    .select({ id: credentialTypes.id })
    .from(credentialTypes)
    .where(eq(credentialTypes.code, "ffn"));
  const [kemsis] = await db
    .select({ id: credentialTypes.id })
    .from(credentialTypes)
    .where(eq(credentialTypes.code, "kemsis"));
  const [fire] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(eq(reportingSystems.code, "fire"));
  if (!ffn || !kemsis || !fire) throw new Error("Reference data is missing.");
  const [set] = await db
    .select({
      id: reportingRequirementSets.id,
      version: reportingRequirementSets.version,
    })
    .from(reportingRequirementSets)
    .where(
      and(
        eq(reportingRequirementSets.reportingSystemId, fire.id),
        eq(reportingRequirementSets.isActive, true),
      ),
    );
  if (!set) throw new Error("Fire requirement set is missing.");
  return {
    ffnTypeId: ffn.id,
    kemsisTypeId: kemsis.id,
    fireSystemId: fire.id,
    setId: set.id,
    setVersion: set.version,
  };
}

function uniquePhone() {
  const digits = crypto
    .randomUUID()
    .replace(/\D/g, "")
    .padEnd(10, "0")
    .slice(0, 10);
  return `+1${digits}`;
}

/**
 * Retires a finalized revision's destinations so it does not linger in the
 * shared reporting queue and pollute other suites that count pending work.
 */
async function retireRevision(db: Db, revisionId: string) {
  await db
    .update(finalizationReportingStatuses)
    .set({ status: "not_required", updatedAt: new Date() })
    .where(eq(finalizationReportingStatuses.revisionId, revisionId));
}

async function createFireClassFixture(db: Db) {
  const suffix = crypto.randomUUID();
  const rawToken = crypto.randomUUID();
  const ids = await fireIds(db);
  const [instructor] = await db
    .insert(users)
    .values({
      username: `cc-instructor-${suffix}`,
      displayName: "Correction Instructor",
      passwordHash: "fixture-password-hash",
      ffn: uniqueFfn(),
      instructorLevel: 2,
    })
    .returning({ id: users.id, username: users.username });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Correction Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Correction Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!instructor || !site || !agency) {
    throw new Error("Correction fixture failed.");
  }
  const [classRecord] = await db
    .insert(trainingClasses)
    .values({
      name: `Correction Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      createdByUserId: instructor.id,
      deliveryMethod: "classroom",
      status: "open",
      signInTokenHash: hashClassSignInToken(rawToken),
    })
    .returning({ id: trainingClasses.id });
  if (!classRecord) throw new Error("Correction class failed.");
  await db
    .insert(classInstructors)
    .values({ classId: classRecord.id, userId: instructor.id, isLead: true });
  await db.insert(classComponents).values({
    classId: classRecord.id,
    startsAt: new Date("2026-09-10T13:00:00Z"),
    endsAt: new Date("2026-09-10T17:00:00Z"),
    creditedHours: "4",
  });
  await db
    .insert(classReportingSystems)
    .values({ classId: classRecord.id, reportingSystemId: ids.fireSystemId });
  const [student] = await db
    .insert(students)
    .values({ firstName: "Fiona", lastName: "Fire", phone: uniquePhone() })
    .returning({ id: students.id });
  if (!student) throw new Error("Correction student failed.");
  return {
    db,
    instructor,
    agency,
    classId: classRecord.id,
    studentId: student.id,
    rawToken,
    ...ids,
  };
}

/**
 * Seeds an active attendance whose stored FFN is malformed, as a credential
 * written before format validation existed would be, with Fire inclusion
 * resolved as excluded.
 */
async function seedMalformedFfnAttendance(
  db: Db,
  fixture: Awaited<ReturnType<typeof createFireClassFixture>>,
  malformedInput?: string,
) {
  // Unique per call so the (type, value_hash) unique index never collides
  // across fixtures, while still failing the FFN format.
  const malformed =
    malformedInput ??
    crypto.randomUUID().replace(/\D/g, "").padEnd(4, "9").slice(0, 4);
  const protectedValue = {
    value: encryptCredential(malformed),
    valueHash: credentialLookupHash(malformed),
    maskedSuffix: credentialMaskedSuffix(malformed),
  };
  await db.insert(studentCredentials).values({
    studentId: fixture.studentId,
    credentialTypeId: fixture.ffnTypeId,
    ...protectedValue,
  });
  const [record] = await db
    .insert(attendance)
    .values({
      classId: fixture.classId,
      studentId: fixture.studentId,
      agencyId: fixture.agency.id,
      idempotencyKey: crypto.randomUUID(),
      payloadFingerprint: "fixture",
      creditedHours: "4",
    })
    .returning({ id: attendance.id });
  if (!record) throw new Error("Correction attendance failed.");
  await db.insert(attendanceReportingContexts).values({
    attendanceId: record.id,
    requirementSetId: fixture.setId,
    included: false,
  });
  await db.insert(attendanceCredentialSnapshots).values({
    attendanceId: record.id,
    requirementSetId: fixture.setId,
    credentialTypeId: fixture.ffnTypeId,
    encryptedValue: protectedValue.value,
    maskedSuffix: protectedValue.maskedSuffix,
  });
  return record.id;
}

describeDatabase("credential correction", () => {
  it("replaces a malformed credential in place and re-derives Fire inclusion", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const fixture = await createFireClassFixture(db);
    const attendanceId = await seedMalformedFfnAttendance(db, fixture);
    const valid = uniqueFfn();

    await correctCredential(db, fixture.instructor, {
      attendanceId,
      credentialTypeId: fixture.ffnTypeId,
      value: valid,
      reason: "Fixed a mistyped FFN",
    });

    const [credential] = await db
      .select()
      .from(studentCredentials)
      .where(
        and(
          eq(studentCredentials.studentId, fixture.studentId),
          eq(studentCredentials.credentialTypeId, fixture.ffnTypeId),
        ),
      );
    expect(credential && decryptCredential(credential.value)).toBe(valid);

    const [context] = await db
      .select()
      .from(attendanceReportingContexts)
      .where(eq(attendanceReportingContexts.attendanceId, attendanceId));
    expect(context?.included).toBe(true);

    const [snapshot] = await db
      .select()
      .from(attendanceCredentialSnapshots)
      .where(eq(attendanceCredentialSnapshots.attendanceId, attendanceId));
    expect(snapshot && decryptCredential(snapshot.encryptedValue)).toBe(valid);

    const corrections = await listClassCredentialCorrections(
      db,
      fixture.classId,
    );
    expect(corrections.get(attendanceId)?.[0]).toMatchObject({
      credentialTypeId: fixture.ffnTypeId,
      valid: true,
    });

    // A correction on an open class flows through to the finalized Fire count.
    const revision = await finalizeClass(
      db,
      fixture.instructor,
      fixture.classId,
      { certified: true, typedName: "Correction Instructor" },
    );
    const [row] = await db
      .select({ summary: finalizationRevisions.summary })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    expect(row?.summary).toMatchObject({ fireEligibleCount: 1 });
    await retireRevision(db, revision.id);
  });

  it("rejects a duplicate value, a bad format, and an unrelated instructor", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const fixture = await createFireClassFixture(db);
    const attendanceId = await seedMalformedFfnAttendance(db, fixture);

    const takenValue = uniqueFfn();
    const [otherStudent] = await db
      .insert(students)
      .values({ firstName: "Other", lastName: "Student", phone: uniquePhone() })
      .returning({ id: students.id });
    if (!otherStudent) throw new Error("Other student failed.");
    await db.insert(studentCredentials).values({
      studentId: otherStudent.id,
      credentialTypeId: fixture.ffnTypeId,
      value: encryptCredential(takenValue),
      valueHash: credentialLookupHash(takenValue),
      maskedSuffix: credentialMaskedSuffix(takenValue),
    });

    await expect(
      correctCredential(db, fixture.instructor, {
        attendanceId,
        credentialTypeId: fixture.ffnTypeId,
        value: takenValue,
        reason: "Duplicate",
      }),
    ).rejects.toThrow(/already in use/i);

    await expect(
      correctCredential(db, fixture.instructor, {
        attendanceId,
        credentialTypeId: fixture.ffnTypeId,
        value: "not-a-number",
        reason: "Bad format",
      }),
    ).rejects.toThrow(/0000-0000/);

    await expect(
      correctCredential(db, fixture.instructor, {
        attendanceId,
        credentialTypeId: fixture.kemsisTypeId,
        value: "K-123",
        reason: "Not prompted",
      }),
    ).rejects.toThrow(/not prompted/i);

    const [unrelated] = await db
      .insert(users)
      .values({
        username: `cc-unrelated-${crypto.randomUUID()}`,
        displayName: "Unrelated Instructor",
        passwordHash: "fixture-password-hash",
      })
      .returning({ id: users.id, username: users.username });
    if (!unrelated) throw new Error("Unrelated instructor failed.");
    await expect(
      correctCredential(db, unrelated, {
        attendanceId,
        credentialTypeId: fixture.ffnTypeId,
        value: uniqueFfn(),
        reason: "Not my class",
      }),
    ).rejects.toThrow(/access denied/i);
  });

  it("refuses to correct a credential once the class is finalized", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const fixture = await createFireClassFixture(db);
    const attendanceId = await seedMalformedFfnAttendance(db, fixture);

    const revision = await finalizeClass(
      db,
      fixture.instructor,
      fixture.classId,
      {
        certified: true,
        typedName: "Correction Instructor",
      },
    );

    await expect(
      correctCredential(db, fixture.instructor, {
        attendanceId,
        credentialTypeId: fixture.ffnTypeId,
        value: uniqueFfn(),
        reason: "After finalization",
      }),
    ).rejects.toThrow(/cannot be corrected/i);

    await retireRevision(db, revision.id);
  });

  it("carries a student's sign-in correction through to the Fire roster", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const fixture = await createFireClassFixture(db);
    const valid = uniqueFfn();

    const workflow = await createWorkflowFromClassToken(db, fixture.rawToken, {
      participant: {
        kind: "regular",
        studentId: fixture.studentId,
        signInMethod: "current_phone",
        profileConfirmed: true,
        fields: {},
        credentials: [],
      },
      selectedAgencyId: null,
      pendingNewPhone: null,
      requirementSets: [{ id: fixture.setId, version: fixture.setVersion }],
    });
    if (!workflow) throw new Error("Workflow was not created.");

    await stageRegularRequirements(db, workflow.token, {
      fields: { email: "signin.correction@example.com" },
      credentials: [{ credentialTypeId: fixture.ffnTypeId, value: valid }],
      agencyId: fixture.agency.id,
    });
    const created = await confirmAttendance(db, workflow.token, {
      attestationConfirmed: true,
      rememberDevice: false,
      request,
    });
    expect(created.status).toBe("created");

    const [credential] = await db
      .select()
      .from(studentCredentials)
      .where(
        and(
          eq(studentCredentials.studentId, fixture.studentId),
          eq(studentCredentials.credentialTypeId, fixture.ffnTypeId),
        ),
      );
    expect(credential && decryptCredential(credential.value)).toBe(valid);
    const [context] = await db
      .select()
      .from(attendanceReportingContexts)
      .where(
        eq(attendanceReportingContexts.attendanceId, created.attendanceId),
      );
    expect(context?.included).toBe(true);

    const revision = await finalizeClass(
      db,
      fixture.instructor,
      fixture.classId,
      {
        certified: true,
        typedName: "Correction Instructor",
      },
    );
    const [row] = await db
      .select({ summary: finalizationRevisions.summary })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    expect(row?.summary).toMatchObject({ fireEligibleCount: 1 });
    await retireRevision(db, revision.id);
  });
});
