import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { runFinalizationReminders } from "../../src/modules/finalization-reminders/service";
import { CLASS_REMINDER_EMAIL_TEMPLATE } from "../../src/modules/notifications/templates";
import { authenticateStaff } from "../../src/modules/staff-auth/authentication";
import { ROLE_CODES } from "../../src/modules/staff-auth/permissions";
import {
  createStaffAccount,
  listStaffAccounts,
  updateStaffAccount,
} from "../../src/modules/staff-auth/staff-accounts";
import * as schema from "../../src/server/db/schema";
import {
  agencies,
  classComponents,
  classInstructors,
  emailDeliveries,
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

const sent = vi.hoisted(
  () => [] as Array<{ recipient: string; subject: string }>,
);

vi.mock("@/modules/notifications/client", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../src/modules/notifications/client")
    >();
  return {
    ...actual,
    sendEmail: vi.fn(
      async (message: { recipient: string; subject: string }) => {
        sent.push({ recipient: message.recipient, subject: message.subject });
        return { providerMessageId: "test-message-id" };
      },
    ),
  };
});

async function createUserWithRole(
  db: ReturnType<typeof drizzle<typeof schema>>,
  roleCode: string,
) {
  const suffix = crypto.randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      username: `${roleCode}-${suffix}`,
      displayName: roleCode,
      passwordHash: "fixture-password-hash",
    })
    .returning({ id: users.id, username: users.username });
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, roleCode));
  if (!user || !role) throw new Error("Account fixture creation failed.");
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
  return user;
}

async function setEmail(
  db: ReturnType<typeof drizzle<typeof schema>>,
  userId: string,
  email: string,
) {
  await db.update(users).set({ email }).where(eq(users.id, userId));
}

async function createOverdueClass(
  db: ReturnType<typeof drizzle<typeof schema>>,
  instructorId: string,
  endsAt: Date,
) {
  const suffix = crypto.randomUUID();
  const [site] = await db
    .insert(trainingSites)
    .values({ name: `Reminder Site ${suffix}` })
    .returning({ id: trainingSites.id });
  const [agency] = await db
    .insert(agencies)
    .values({ name: `Reminder Agency ${suffix}` })
    .returning({ id: agencies.id });
  if (!site || !agency) throw new Error("Class fixture creation failed.");
  const [classRecord] = await db
    .insert(trainingClasses)
    .values({
      name: `Reminder Course ${suffix}`,
      trainingSiteId: site.id,
      hostAgencyId: agency.id,
      createdByUserId: instructorId,
      deliveryMethod: "classroom",
      status: "open",
      signInTokenHash: crypto.randomUUID(),
    })
    .returning({ id: trainingClasses.id });
  if (!classRecord) throw new Error("Class creation failed.");
  await db
    .insert(classInstructors)
    .values({ classId: classRecord.id, userId: instructorId, isLead: true });
  await db.insert(classComponents).values({
    classId: classRecord.id,
    startsAt: new Date(endsAt.getTime() - 4 * 60 * 60 * 1000),
    endsAt,
    creditedHours: "4",
  });
  return classRecord.id;
}

beforeAll(async () => {
  if (!pool) return;
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.transaction(seedFoundation);
});

afterAll(async () => {
  await pool?.end();
});

describeDatabase("staff email identity", () => {
  it("stores, normalizes, lists, and clears an account email", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const admin = await createUserWithRole(db, ROLE_CODES.ADMINISTRATOR);
    const suffix = crypto.randomUUID();
    const account = await createStaffAccount(db, admin.id, {
      username: `email-${suffix}`,
      email: "  Welcome@Example.COM ",
      displayName: "Email Account",
      password: "A secure fixture password 1!",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });

    const [stored] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, account.id));
    expect(stored?.email).toBe("welcome@example.com");

    const accounts = await listStaffAccounts(db, admin.id, "welcome@example");
    expect(accounts.map((row) => row.id)).toContain(account.id);

    await updateStaffAccount(db, admin.id, { userId: account.id, email: "" });
    const [cleared] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, account.id));
    expect(cleared?.email).toBeNull();
  });

  it("rejects a duplicate email ignoring case", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const admin = await createUserWithRole(db, ROLE_CODES.ADMINISTRATOR);
    const suffix = crypto.randomUUID();
    await createStaffAccount(db, admin.id, {
      username: `first-${suffix}`,
      email: `shared-${suffix}@example.com`,
      displayName: "First",
      password: "A secure fixture password 1!",
      roleCode: ROLE_CODES.INSTRUCTOR,
    });
    await expect(
      createStaffAccount(db, admin.id, {
        username: `second-${suffix}`,
        email: `Shared-${suffix}@Example.com`,
        displayName: "Second",
        password: "A secure fixture password 1!",
        roleCode: ROLE_CODES.INSTRUCTOR,
      }),
    ).rejects.toThrow(/already assigned/i);
  });

  it("authenticates with a username or an email", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const admin = await createUserWithRole(db, ROLE_CODES.ADMINISTRATOR);
    const suffix = crypto.randomUUID();
    const password = "A secure fixture password 1!";
    await createStaffAccount(db, admin.id, {
      username: `signin-${suffix}`,
      email: `Signin-${suffix}@Example.com`,
      displayName: "Sign In",
      password,
      roleCode: ROLE_CODES.INSTRUCTOR,
    });

    const byUsername = await authenticateStaff(
      `signin-${suffix}`,
      password,
      undefined,
      db,
    );
    expect(byUsername?.username).toBe(`signin-${suffix}`);

    const byEmail = await authenticateStaff(
      `signin-${suffix}@example.com`,
      password,
      undefined,
      db,
    );
    expect(byEmail?.username).toBe(`signin-${suffix}`);

    const byMixedCaseEmail = await authenticateStaff(
      `SIGNIN-${suffix.toUpperCase()}@EXAMPLE.COM`,
      password,
      undefined,
      db,
    );
    expect(byMixedCaseEmail?.username).toBe(`signin-${suffix}`);

    const unknown = await authenticateStaff(
      `nobody-${suffix}@example.com`,
      password,
      undefined,
      db,
    );
    expect(unknown).toBeNull();
  });
});

describeDatabase("class finalization reminders", () => {
  const now = new Date("2026-10-17T12:00:00.000Z");
  const DAY_MS = 24 * 60 * 60 * 1000;

  const messagesTo = (email: string) =>
    sent.filter((message) => message.recipient === email);

  async function reminderDeliveries(
    db: ReturnType<typeof drizzle<typeof schema>>,
    userId: string,
  ) {
    return db
      .select({ id: emailDeliveries.id })
      .from(emailDeliveries)
      .where(
        and(
          eq(emailDeliveries.referenceId, userId),
          eq(emailDeliveries.template, CLASS_REMINDER_EMAIL_TEMPLATE),
        ),
      );
  }

  it("sends one digest, suppresses a same-day repeat, and resumes after reopen", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createUserWithRole(db, ROLE_CODES.INSTRUCTOR);
    const email = `${instructor.username}@example.com`;
    await setEmail(db, instructor.id, email);
    const classId = await createOverdueClass(
      db,
      instructor.id,
      new Date(now.getTime() - 25 * 60 * 60 * 1000),
    );

    sent.length = 0;
    await runFinalizationReminders(db, now);
    expect(messagesTo(email)).toHaveLength(1);
    expect(messagesTo(email)[0]?.subject).toBe("1 roster awaits finalization");

    // A second run on the same day is suppressed.
    await runFinalizationReminders(db, now);
    expect(messagesTo(email)).toHaveLength(1);
    expect(await reminderDeliveries(db, instructor.id)).toHaveLength(1);

    // A finalized class drops out of later digests.
    await db
      .update(trainingClasses)
      .set({ status: "finalized" })
      .where(eq(trainingClasses.id, classId));
    const nextDay = new Date(now.getTime() + DAY_MS);
    await runFinalizationReminders(db, nextDay);
    expect(messagesTo(email)).toHaveLength(1);

    // A cancelled class also drops out.
    await db
      .update(trainingClasses)
      .set({ status: "open" })
      .where(eq(trainingClasses.id, classId));
    await db
      .update(trainingClasses)
      .set({ status: "cancelled", cancellationReason: "Weather" })
      .where(eq(trainingClasses.id, classId));
    await runFinalizationReminders(db, nextDay);
    expect(messagesTo(email)).toHaveLength(1);

    // Reopening resumes reminding.
    await db
      .update(trainingClasses)
      .set({ status: "open" })
      .where(eq(trainingClasses.id, classId));
    await runFinalizationReminders(db, nextDay);
    expect(messagesTo(email)).toHaveLength(2);
  });

  it("skips a signer with no email and completes the run", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createUserWithRole(db, ROLE_CODES.INSTRUCTOR);
    await createOverdueClass(
      db,
      instructor.id,
      new Date(now.getTime() - 30 * 60 * 60 * 1000),
    );
    const summary = await runFinalizationReminders(db, now);
    expect(summary.failed).toBe(0);
    expect(await reminderDeliveries(db, instructor.id)).toHaveLength(0);
  });

  it("skips an inactive signer", async () => {
    if (!pool) throw new Error("TEST_DATABASE_URL is required.");
    const db = drizzle(pool, { schema });
    const instructor = await createUserWithRole(db, ROLE_CODES.INSTRUCTOR);
    const email = `${instructor.username}@example.com`;
    await setEmail(db, instructor.id, email);
    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, instructor.id));
    await createOverdueClass(
      db,
      instructor.id,
      new Date(now.getTime() - 30 * 60 * 60 * 1000),
    );
    await runFinalizationReminders(db, now);
    expect(messagesTo(email)).toHaveLength(0);
    expect(await reminderDeliveries(db, instructor.id)).toHaveLength(0);
  });
});
