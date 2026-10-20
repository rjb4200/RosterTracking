import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  finalizeClass,
  reopenFinalizedClass,
  signFireRoster,
  updateReportingDestination,
} from "../../src/modules/classes/finalization";
import {
  createOpenClass,
  removeClassInstructor,
  setClassInstructors,
} from "../../src/modules/classes/services";
import { generateCompletionCertificates } from "../../src/modules/completion-certificates/service";
import {
  generateFireRosterWithNotices,
  renderParticipantNotice,
} from "../../src/modules/individual-training-notices/service";
import { readSnapshot } from "../../src/modules/official-roster-pdfs/service";
import {
  decryptCredential,
  encryptCredential,
} from "../../src/modules/reference/crypto";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import { seedReferenceData } from "../../src/server/db/reference-seed";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  attendance,
  attendanceReportingContexts,
  classInstructors,
  finalizationReportingStatuses,
  finalizationRevisions,
  reportingRequirementSets,
  reportingSystems,
  revisionAttestations,
  students,
  trainingCodes,
  trainingSites,
} from "../../src/server/db/schema";
import { seedFoundation } from "../../src/server/db/seed";
import { createStaffUser } from "./support/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString
  ? new Pool({ connectionString, max: 1 })
  : undefined;

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function activeSetId(db: Db, code: string) {
  const [system] = await db
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(eq(reportingSystems.code, code));
  if (!system) throw new Error(`${code} reporting system is missing.`);
  const [set] = await db
    .select({ id: reportingRequirementSets.id })
    .from(reportingRequirementSets)
    .where(
      and(
        eq(reportingRequirementSets.reportingSystemId, system.id),
        eq(reportingRequirementSets.isActive, true),
      ),
    );
  if (!set) throw new Error(`${code} reporting system has no active set.`);
  return { systemId: system.id, setId: set.id };
}

async function activeFireSetId(db: Db) {
  return activeSetId(db, "fire");
}

async function fireReferences(db: Db, suffix: string) {
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Assistant Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Assistant Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [code] = await db
    .insert(trainingCodes)
    .values({
      code: `A0000-${suffix.slice(0, 6)}`,
      title: "Hose Loads",
      sourceRevision: "test",
    })
    .returning({ id: trainingCodes.id });
  if (!site || !agency || !code) {
    throw new Error("Assistant fixture references failed.");
  }
  const { systemId, setId } = await activeFireSetId(db);
  return {
    siteId: site.id,
    agencyId: agency.id,
    codeId: code.id,
    systemId,
    setId,
  };
}

async function addParticipant(
  db: Db,
  classId: string,
  agencyId: string,
  requirementSetId: string,
) {
  const digits = crypto
    .randomUUID()
    .replace(/\D/g, "")
    .padEnd(10, "0")
    .slice(0, 10);
  const [student] = await db
    .insert(students)
    .values({ firstName: "Zoe", lastName: "Zeta", phone: `+1${digits}` })
    .returning({ id: students.id });
  if (!student) throw new Error("Assistant fixture student failed.");
  const [record] = await db
    .insert(attendance)
    .values({
      classId,
      studentId: student.id,
      agencyId,
      idempotencyKey: crypto.randomUUID(),
      payloadFingerprint: "fixture",
      creditedHours: "4",
    })
    .returning({ id: attendance.id });
  if (!record) throw new Error("Assistant fixture attendance failed.");
  await db.insert(attendanceReportingContexts).values({
    attendanceId: record.id,
    requirementSetId,
  });
  return record.id;
}

async function createEmsLedFireClass(db: Db, suffix: string) {
  const lead = await createStaffUser(db, {
    username: `ems-lead-${suffix}`,
    displayName: "EMS Lead",
    roleCode: ROLE_CODES.INSTRUCTOR,
    ffn: null,
    instructorLevel: null,
  });
  const fire = await createStaffUser(db, {
    username: `fire-assistant-${suffix}`,
    displayName: "Fire Assistant",
    roleCode: ROLE_CODES.INSTRUCTOR,
  });
  const references = await fireReferences(db, suffix);
  const created = await createOpenClass(db, lead, {
    name: `EMS Led Fire ${suffix}`,
    trainingSiteId: references.siteId,
    hostAgencyId: references.agencyId,
    deliveryMethod: "classroom",
    startsAt: "2026-09-10T09:00",
    creditedHours: 4,
    leadInstructorId: lead.id,
    assistantInstructorId: fire.id,
    reportingSystemIds: [references.systemId],
    accessPinEnabled: false,
    subjects: [
      {
        trainingCodeId: references.codeId,
        className: "Hose Loads",
        curriculumId: "",
        lessonPlan: "",
      },
    ],
  });
  const classId = created.classRecord.id;
  const attendanceId = await addParticipant(
    db,
    classId,
    references.agencyId,
    references.setId,
  );
  return { lead, fire, classId, attendanceId, ...references };
}

async function createEmsLedFireKbemsClass(db: Db, suffix: string) {
  const lead = await createStaffUser(db, {
    username: `both-lead-${suffix}`,
    displayName: "EMS Lead",
    roleCode: ROLE_CODES.INSTRUCTOR,
    ffn: null,
    instructorLevel: null,
  });
  const fire = await createStaffUser(db, {
    username: `both-fire-${suffix}`,
    displayName: "Fire Assistant",
    roleCode: ROLE_CODES.INSTRUCTOR,
  });
  const admin = await createStaffUser(db, {
    username: `both-admin-${suffix}`,
    displayName: "Training Major",
    roleCode: ROLE_CODES.ADMINISTRATOR,
  });
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Both Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Both Agency ${suffix}` })
    .returning({ id: agencies.id });
  const [code] = await db
    .insert(trainingCodes)
    .values({
      code: `B0000-${suffix.slice(0, 6)}`,
      title: "Hose Loads",
      sourceRevision: "test",
    })
    .returning({ id: trainingCodes.id });
  const [emsCategory] = await db
    .select({ id: trainingCodes.id })
    .from(trainingCodes)
    .where(eq(trainingCodes.kind, "ems"))
    .limit(1);
  if (!site || !agency || !code || !emsCategory) {
    throw new Error("Both-destination fixture references failed.");
  }
  const fireSet = await activeSetId(db, "fire");
  const kbemsSet = await activeSetId(db, "kbems");
  const created = await createOpenClass(db, lead, {
    name: `EMS Led Fire and KBEMS ${suffix}`,
    trainingSiteId: site.id,
    hostAgencyId: agency.id,
    deliveryMethod: "classroom",
    startsAt: "2026-09-10T09:00",
    creditedHours: 4,
    leadInstructorId: lead.id,
    assistantInstructorId: fire.id,
    reportingSystemIds: [fireSet.systemId, kbemsSet.systemId],
    accessPinEnabled: false,
    courseType: "continuing_education",
    courseNumber: `CE-${suffix.slice(0, 6)}`,
    objectives: "Continuing education for EMTs",
    emsCategoryId: emsCategory.id,
    subjects: [
      {
        trainingCodeId: code.id,
        className: "Hose Loads",
        curriculumId: "",
        lessonPlan: "",
      },
    ],
  });
  const classId = created.classRecord.id;
  const attendanceId = await addParticipant(
    db,
    classId,
    agency.id,
    fireSet.setId,
  );
  await db.insert(attendanceReportingContexts).values({
    attendanceId,
    requirementSetId: kbemsSet.setId,
  });
  return { lead, fire, admin, classId, ...fireSet, kbemsSet };
}

beforeAll(async () => {
  if (!pool) return;
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.transaction(seedFoundation);
  await db.transaction(seedReferenceData);
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("assistant instructor and Fire signing", () => {
  it("records a non-fire lead with a fire assistant", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { lead, fire, classId } = await createEmsLedFireClass(
      db,
      crypto.randomUUID().slice(0, 8),
    );
    const assignments = await db
      .select({
        userId: classInstructors.userId,
        isLead: classInstructors.isLead,
      })
      .from(classInstructors)
      .where(eq(classInstructors.classId, classId));
    expect(assignments.find((row) => row.userId === lead.id)?.isLead).toBe(
      true,
    );
    expect(assignments.find((row) => row.userId === fire.id)?.isLead).toBe(
      false,
    );
  });

  it("blocks a Fire class with no fire instructor", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const lead = await createStaffUser(db, {
      username: `no-fire-lead-${suffix}`,
      displayName: "No Fire Lead",
      roleCode: ROLE_CODES.INSTRUCTOR,
      ffn: null,
      instructorLevel: null,
    });
    const assistant = await createStaffUser(db, {
      username: `no-fire-assistant-${suffix}`,
      displayName: "No Fire Assistant",
      roleCode: ROLE_CODES.INSTRUCTOR,
      ffn: null,
      instructorLevel: null,
    });
    const references = await fireReferences(db, suffix);
    await expect(
      createOpenClass(db, lead, {
        name: `No Fire Instructor ${suffix}`,
        trainingSiteId: references.siteId,
        hostAgencyId: references.agencyId,
        deliveryMethod: "classroom",
        startsAt: "2026-09-10T09:00",
        creditedHours: 4,
        leadInstructorId: lead.id,
        assistantInstructorId: assistant.id,
        reportingSystemIds: [references.systemId],
        accessPinEnabled: false,
        subjects: [
          {
            trainingCodeId: references.codeId,
            className: "Hose Loads",
            curriculumId: "",
            lessonPlan: "",
          },
        ],
      }),
    ).rejects.toThrow(/fire instructor/i);
  });

  it("replaces the lead and sets, changes, or clears the assistant", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const { lead, fire, classId } = await createEmsLedFireClass(db, suffix);

    await setClassInstructors(db, lead, classId, {
      leadInstructorId: fire.id,
      assistantInstructorId: lead.id,
    });
    let assignments = await db
      .select({
        userId: classInstructors.userId,
        isLead: classInstructors.isLead,
      })
      .from(classInstructors)
      .where(eq(classInstructors.classId, classId));
    expect(assignments.find((row) => row.userId === fire.id)?.isLead).toBe(
      true,
    );
    expect(assignments.find((row) => row.userId === lead.id)?.isLead).toBe(
      false,
    );

    await expect(
      setClassInstructors(db, lead, classId, {
        leadInstructorId: fire.id,
        assistantInstructorId: fire.id,
      }),
    ).rejects.toThrow(/different from the lead/i);

    await removeClassInstructor(db, lead, classId, lead.id);
    assignments = await db
      .select({
        userId: classInstructors.userId,
        isLead: classInstructors.isLead,
      })
      .from(classInstructors)
      .where(eq(classInstructors.classId, classId));
    expect(assignments).toHaveLength(1);
    expect(assignments[0]?.userId).toBe(fire.id);

    await expect(
      removeClassInstructor(db, lead, classId, fire.id),
    ).rejects.toThrow(/replace the lead/i);
  });

  it("keeps a fire instructor after an instructor change", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const nonFire = await createStaffUser(db, {
      username: `retention-nonfire-${suffix}`,
      displayName: "Non Fire",
      roleCode: ROLE_CODES.INSTRUCTOR,
      ffn: null,
      instructorLevel: null,
    });
    const fire = await createStaffUser(db, {
      username: `retention-fire-${suffix}`,
      displayName: "Fire Only",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });
    const references = await fireReferences(db, suffix);
    const created = await createOpenClass(db, fire, {
      name: `Fire Retention ${suffix}`,
      trainingSiteId: references.siteId,
      hostAgencyId: references.agencyId,
      deliveryMethod: "classroom",
      startsAt: "2026-09-10T09:00",
      creditedHours: 4,
      leadInstructorId: fire.id,
      reportingSystemIds: [references.systemId],
      accessPinEnabled: false,
      subjects: [
        {
          trainingCodeId: references.codeId,
          className: "Hose Loads",
          curriculumId: "",
          lessonPlan: "",
        },
      ],
    });
    const classId = created.classRecord.id;

    await expect(
      setClassInstructors(db, fire, classId, {
        leadInstructorId: nonFire.id,
        assistantInstructorId: null,
      }),
    ).rejects.toThrow(/fire instructor/i);

    await setClassInstructors(db, fire, classId, {
      leadInstructorId: nonFire.id,
      assistantInstructorId: fire.id,
    });
    const assignments = await db
      .select({
        userId: classInstructors.userId,
        isLead: classInstructors.isLead,
      })
      .from(classInstructors)
      .where(eq(classInstructors.classId, classId));
    expect(assignments.find((row) => row.userId === nonFire.id)?.isLead).toBe(
      true,
    );
    expect(assignments.find((row) => row.userId === fire.id)?.isLead).toBe(
      false,
    );
  });

  it("gates the Fire documents, reporting, and signer, then signs the locked revision", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const suffix = crypto.randomUUID().slice(0, 8);
    const { lead, fire, classId, attendanceId, systemId } =
      await createEmsLedFireClass(db, suffix);
    const admin = await createStaffUser(db, {
      username: `assistant-admin-${suffix}`,
      displayName: "Assistant Admin",
      roleCode: ROLE_CODES.ADMINISTRATOR,
    });

    const revision = await finalizeClass(db, lead, classId, {
      certified: true,
      typedName: "EMS Lead",
    });
    const [row] = await db
      .select({
        fireSignerUserId: finalizationRevisions.fireSignerUserId,
        signedByName: finalizationRevisions.signedByName,
      })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revision.id));
    expect(row?.fireSignerUserId).toBe(fire.id);
    expect(row?.signedByName).toBe("EMS Lead");
    const [pendingAttestation] = await db
      .select({ revisionId: revisionAttestations.revisionId })
      .from(revisionAttestations)
      .where(
        and(
          eq(revisionAttestations.revisionId, revision.id),
          eq(revisionAttestations.scope, "fire"),
        ),
      );
    expect(pendingAttestation).toBeUndefined();

    await expect(
      generateFireRosterWithNotices(db, lead, revision.id),
    ).rejects.toThrow(/fire instructor signs/i);
    await expect(
      renderParticipantNotice(db, lead, revision.id, attendanceId, "yellow"),
    ).rejects.toThrow(/fire instructor signs/i);

    const [status] = await db
      .select({ id: finalizationReportingStatuses.id })
      .from(finalizationReportingStatuses)
      .where(
        and(
          eq(finalizationReportingStatuses.revisionId, revision.id),
          eq(finalizationReportingStatuses.reportingSystemId, systemId),
        ),
      );
    if (!status) throw new Error("Fire reporting status is missing.");
    await expect(
      updateReportingDestination(db, admin, {
        revisionId: revision.id,
        reportingSystemId: systemId,
        status: "entered",
      }),
    ).rejects.toThrow(/signed by the fire instructor/i);

    await expect(
      signFireRoster(db, lead, revision.id, {
        certified: true,
        typedName: "EMS Lead",
      }),
    ).rejects.toThrow(/Fire signer/i);

    await signFireRoster(db, fire, revision.id, {
      certified: true,
      typedName: "Fire Assistant",
    });
    const [signed] = await db
      .select({
        fireSignedByName: revisionAttestations.signedByName,
        fireSignedAt: revisionAttestations.signedAt,
      })
      .from(revisionAttestations)
      .where(
        and(
          eq(revisionAttestations.revisionId, revision.id),
          eq(revisionAttestations.scope, "fire"),
        ),
      );
    expect(signed?.fireSignedByName).toBe("Fire Assistant");
    expect(signed?.fireSignedAt).toBeInstanceOf(Date);

    const snapshot = await readSnapshot(db, lead, revision.id);
    expect(snapshot.signature?.name).toBe("EMS Lead");
    expect(snapshot.fireSignature?.name).toBe("Fire Assistant");
    await expect(
      generateFireRosterWithNotices(db, lead, revision.id),
    ).resolves.toMatchObject({ filename: expect.stringMatching(/^kfs-1a-/) });

    await updateReportingDestination(db, admin, {
      revisionId: revision.id,
      reportingSystemId: systemId,
      status: "entered",
    });

    await reopenFinalizedClass(db, admin, classId, "Correct the assistant");
    await expect(
      signFireRoster(db, fire, revision.id, {
        certified: true,
        typedName: "Fire Assistant",
      }),
    ).rejects.toThrow(/finalized class/i);

    const nextRevision = await finalizeClass(db, lead, classId, {
      certified: true,
      typedName: "EMS Lead",
    });
    const [next] = await db
      .select({ fireSignerUserId: finalizationRevisions.fireSignerUserId })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, nextRevision.id));
    expect(next?.fireSignerUserId).toBe(fire.id);
    const [nextAttestation] = await db
      .select({ revisionId: revisionAttestations.revisionId })
      .from(revisionAttestations)
      .where(
        and(
          eq(revisionAttestations.revisionId, nextRevision.id),
          eq(revisionAttestations.scope, "fire"),
        ),
      );
    expect(nextAttestation).toBeUndefined();
  });

  it("issues the certificate after the roster attestation while the Fire documents wait", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const {
      lead,
      fire,
      admin,
      classId,
      systemId: fireSystemId,
    } = await createEmsLedFireKbemsClass(db, crypto.randomUUID().slice(0, 8));
    const revision = await finalizeClass(db, lead, classId, {
      certified: true,
      typedName: "EMS Lead",
    });
    const attestations = await db
      .select({
        scope: revisionAttestations.scope,
        signedByUserId: revisionAttestations.signedByUserId,
      })
      .from(revisionAttestations)
      .where(eq(revisionAttestations.revisionId, revision.id));
    expect(attestations).toEqual([
      { scope: "roster", signedByUserId: lead.id },
    ]);

    const snapshot = await readSnapshot(db, lead, revision.id);
    expect(snapshot.signature?.name).toBe("EMS Lead");
    expect(snapshot.fireSignature).toBeUndefined();

    await expect(
      generateCompletionCertificates(db, lead, revision.id),
    ).resolves.toMatchObject({ participantCount: 1 });
    await expect(
      generateFireRosterWithNotices(db, lead, revision.id),
    ).rejects.toThrow(/fire instructor signs/i);
    await expect(
      updateReportingDestination(db, admin, {
        revisionId: revision.id,
        reportingSystemId: fireSystemId,
        status: "entered",
      }),
    ).rejects.toThrow(/fire instructor/i);

    await signFireRoster(db, fire, revision.id, {
      certified: true,
      typedName: "Fire Assistant",
    });
    const [fireAttestation] = await db
      .select({
        signedByName: revisionAttestations.signedByName,
        signedByUserId: revisionAttestations.signedByUserId,
      })
      .from(revisionAttestations)
      .where(
        and(
          eq(revisionAttestations.revisionId, revision.id),
          eq(revisionAttestations.scope, "fire"),
        ),
      );
    expect(fireAttestation).toMatchObject({
      signedByName: "Fire Assistant",
      signedByUserId: fire.id,
    });
    await expect(
      generateFireRosterWithNotices(db, lead, revision.id),
    ).resolves.toMatchObject({ filename: expect.stringMatching(/^kfs-1a-/) });
    await updateReportingDestination(db, admin, {
      revisionId: revision.id,
      reportingSystemId: fireSystemId,
      status: "entered",
    });
  });

  it("dual-reads a legacy revision's single signature for both scopes", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const { lead, classId } = await createEmsLedFireClass(
      db,
      crypto.randomUUID().slice(0, 8),
    );
    const current = await finalizeClass(db, lead, classId, {
      certified: true,
      typedName: "Current Lead",
    });
    const [currentRow] = await db
      .select({ encryptedSnapshot: finalizationRevisions.encryptedSnapshot })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, current.id));
    if (!currentRow) throw new Error("Current revision is missing.");
    const parsed = JSON.parse(
      decryptCredential(currentRow.encryptedSnapshot),
    ) as Record<string, unknown>;
    delete parsed.fireSignerUserId;
    delete parsed.fireSignature;
    const [legacy] = await db
      .insert(finalizationRevisions)
      .values({
        classId,
        revisionNumber: 2,
        finalizedByUserId: lead.id,
        signedByUserId: lead.id,
        signedByName: "Legacy Lead",
        signedAt: new Date(),
        attestationVersion: "roster-attestation-001",
        fireSignerUserId: null,
        encryptedSnapshot: encryptCredential(JSON.stringify(parsed)),
        summary: {},
      })
      .returning({ id: finalizationRevisions.id });
    if (!legacy) throw new Error("Legacy revision fixture failed.");

    const snapshot = await readSnapshot(db, lead, legacy.id);
    expect(snapshot.signature?.name).toBe("Legacy Lead");
    expect(snapshot.fireSignature?.name).toBe("Legacy Lead");
    expect(snapshot.rosterAttested).toBe(false);
    expect(snapshot.fireAttested).toBe(false);
  });
});
