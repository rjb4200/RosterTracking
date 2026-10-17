import { describe, expect, it } from "vitest";

import {
  groupReminders,
  isReminderDue,
  REMINDER_DELAY_MS,
  type ReminderAccount,
  type ReminderClass,
  resolveSigningInstructor,
} from "./domain";

const NOW = new Date("2026-10-17T12:00:00.000Z");

function endingBefore(ms: number): Date {
  return new Date(NOW.getTime() + ms);
}

describe("reminder timing", () => {
  it("is not due at exactly 24 hours after the final session", () => {
    expect(isReminderDue(endingBefore(-REMINDER_DELAY_MS), NOW)).toBe(false);
  });

  it("is due once more than 24 hours have passed", () => {
    expect(isReminderDue(endingBefore(-REMINDER_DELAY_MS - 1), NOW)).toBe(true);
  });

  it("is not due before the final session has ended", () => {
    expect(isReminderDue(endingBefore(60_000), NOW)).toBe(false);
  });

  it("is not due without a scheduled end", () => {
    expect(isReminderDue(null, NOW)).toBe(false);
  });
});

describe("signing instructor resolution", () => {
  it("prefers the lead instructor", () => {
    expect(
      resolveSigningInstructor([
        { userId: "assistant", isLead: false },
        { userId: "lead", isLead: true },
      ]),
    ).toEqual({ userId: "lead", isLead: true });
  });

  it("falls back to the first instructor when no lead is set", () => {
    expect(
      resolveSigningInstructor([{ userId: "only", isLead: false }]),
    ).toEqual({ userId: "only", isLead: false });
  });

  it("returns null when no instructor is assigned", () => {
    expect(resolveSigningInstructor([])).toBeNull();
  });
});

describe("reminder grouping", () => {
  function account(
    userId: string,
    overrides: Partial<ReminderAccount> = {},
  ): ReminderAccount {
    return {
      userId,
      email: `${userId}@example.com`,
      isActive: true,
      displayName: `Instructor ${userId}`,
      ...overrides,
    };
  }

  function classRecord(
    classId: string,
    instructors: ReminderClass["instructors"],
  ): ReminderClass {
    return {
      classId,
      className: `Class ${classId}`,
      finalSessionEndsAt: endingBefore(-REMINDER_DELAY_MS - 1),
      instructors,
    };
  }

  it("groups multiple classes under one recipient", () => {
    const accounts = new Map([account("lead")].map((a) => [a.userId, a]));
    const digests = groupReminders(
      [
        classRecord("c1", [{ userId: "lead", isLead: true }]),
        classRecord("c2", [{ userId: "lead", isLead: true }]),
      ],
      accounts,
    );
    expect(digests).toHaveLength(1);
    expect(digests[0]?.classes.map((c) => c.classId)).toEqual(["c1", "c2"]);
  });

  it("attributes a class to its lead, not an assistant", () => {
    const accounts = new Map(
      [account("lead"), account("assistant")].map((a) => [a.userId, a]),
    );
    const digests = groupReminders(
      [
        classRecord("c1", [
          { userId: "lead", isLead: true },
          { userId: "assistant", isLead: false },
        ]),
      ],
      accounts,
    );
    expect(digests.map((d) => d.userId)).toEqual(["lead"]);
  });

  it("skips a signer with no email", () => {
    const accounts = new Map(
      [account("lead", { email: null })].map((a) => [a.userId, a]),
    );
    expect(
      groupReminders(
        [classRecord("c1", [{ userId: "lead", isLead: true }])],
        accounts,
      ),
    ).toEqual([]);
  });

  it("skips an inactive signer", () => {
    const accounts = new Map(
      [account("lead", { isActive: false })].map((a) => [a.userId, a]),
    );
    expect(
      groupReminders(
        [classRecord("c1", [{ userId: "lead", isLead: true }])],
        accounts,
      ),
    ).toEqual([]);
  });
});
