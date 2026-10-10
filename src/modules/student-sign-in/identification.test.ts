import { describe, expect, it } from "vitest";

import type { Database } from "@/server/db/client";

import {
  clearParticipantForNotMe,
  confirmRecognizedStudent,
  normalizeRecoveryEmail,
  RECOVERY_CREDENTIAL_TYPES,
  recoverActiveStudent,
  recoveryEmailMatches,
  stagePendingRecognizedStudent,
} from "./identification";
import { emptySignInWorkflowState } from "./types";

const studentId = "00000000-0000-4000-8000-000000000001";

/**
 * Chainable stub that yields one queued result per query. Awaiting a query
 * without `.limit()` resolves to its rows; `.limit()` resolves to a promise.
 */
function fakeDatabase(results: unknown[][]) {
  const queue = [...results];
  const make = (rows: unknown[]) => {
    const resolved = Promise.resolve(rows);
    const query = Object.assign(resolved, {
      from: () => query,
      innerJoin: () => query,
      where: () => query,
      limit: () => resolved,
    });
    return query;
  };
  return {
    select: () => make(queue.shift() ?? []),
  } as unknown as Database;
}

const priorPhone = "+15025550100";
const newPhone = "+15025550199";

describe("changed-number recovery", () => {
  it("matches the stored email case-insensitively with whitespace ignored", () => {
    expect(
      recoveryEmailMatches("  Student@Example.org ", "student@example.org"),
    ).toBe(true);
    expect(
      recoveryEmailMatches("student@example.org", "other@example.org"),
    ).toBe(false);
  });

  it("recovers on an exact prior phone plus the stored email", async () => {
    const db = fakeDatabase([
      [
        {
          id: studentId,
          firstName: "Ada",
          lastName: "Lovelace",
          email: "Student@Example.org",
        },
      ],
      [],
      [{ code: "ffn", maskedSuffix: "5678" }],
    ]);
    const result = await recoverActiveStudent(db, {
      priorPhone,
      newPhone,
      email: " student@example.org ",
    });
    expect(result).toEqual({
      status: "identified",
      method: "recovery",
      replacementPhone: newPhone,
      maskedCredentials: [{ code: "ffn", maskedSuffix: "5678" }],
      student: { id: studentId, firstName: "Ada", lastName: "Lovelace" },
    });
  });

  it("returns the generic failure when the stored email is missing", async () => {
    const db = fakeDatabase([
      [{ id: studentId, firstName: "Ada", lastName: "Lovelace", email: null }],
    ]);
    await expect(
      recoverActiveStudent(db, {
        priorPhone,
        newPhone,
        email: "student@example.org",
      }),
    ).resolves.toEqual({ status: "recovery_or_guest" });
  });

  it("returns the generic failure on an email mismatch", async () => {
    const db = fakeDatabase([
      [
        {
          id: studentId,
          firstName: "Ada",
          lastName: "Lovelace",
          email: "other@example.org",
        },
      ],
    ]);
    await expect(
      recoverActiveStudent(db, {
        priorPhone,
        newPhone,
        email: "student@example.org",
      }),
    ).resolves.toEqual({ status: "recovery_or_guest" });
  });

  it("returns the generic failure when the new phone is already taken", async () => {
    const db = fakeDatabase([
      [
        {
          id: studentId,
          firstName: "Ada",
          lastName: "Lovelace",
          email: "student@example.org",
        },
      ],
      [{ id: "00000000-0000-4000-8000-000000000009" }],
    ]);
    await expect(
      recoverActiveStudent(db, {
        priorPhone,
        newPhone,
        email: "student@example.org",
      }),
    ).resolves.toEqual({ status: "recovery_or_guest" });
  });

  it("returns the generic failure for an invalid email without querying", async () => {
    const db = fakeDatabase([]);
    await expect(
      recoverActiveStudent(db, { priorPhone, newPhone, email: "not-an-email" }),
    ).resolves.toEqual({ status: "recovery_or_guest" });
  });
});

describe("student recovery policy", () => {
  it("keeps a recognized profile unconfirmed until the visitor accepts it", () => {
    const state = stagePendingRecognizedStudent(emptySignInWorkflowState(), {
      status: "identified",
      method: "remembered_device",
      rememberedDeviceId: "00000000-0000-4000-8000-000000000003",
      student: { id: studentId, firstName: "Ada", lastName: "Lovelace" },
    });

    expect(state.participant).toMatchObject({
      kind: "regular",
      studentId,
      profileConfirmed: false,
      signInMethod: "remembered_device",
    });
  });

  it("retains FFN and KEMSIS only as optional masked profile labels", () => {
    expect(RECOVERY_CREDENTIAL_TYPES).toEqual(["ffn", "kemsis"]);
  });

  it("matches recovery email case-insensitively and rejects missing addresses", () => {
    expect(normalizeRecoveryEmail("  Student@Example.org ")).toBe(
      "student@example.org",
    );
    expect(normalizeRecoveryEmail("")).toBeNull();
    expect(normalizeRecoveryEmail("not-an-email")).toBeNull();
  });

  it("requires affirmative confirmation to stage a recovered phone", () => {
    const state = confirmRecognizedStudent(emptySignInWorkflowState(), {
      status: "identified",
      method: "recovery",
      replacementPhone: "+18595551234",
      student: { id: studentId, firstName: "Ada", lastName: "Lovelace" },
    });
    expect(state.participant).toMatchObject({
      kind: "regular",
      studentId,
      signInMethod: "recovery",
      profileConfirmed: true,
      replacementPhone: "+18595551234",
    });
  });

  it("clears identity, recovery phone, and agency on Not me", () => {
    const identified = confirmRecognizedStudent(emptySignInWorkflowState(), {
      status: "identified",
      method: "recovery",
      replacementPhone: "+18595551234",
      student: { id: studentId, firstName: "Ada", lastName: "Lovelace" },
    });
    const cleared = clearParticipantForNotMe({
      ...identified,
      selectedAgencyId: "00000000-0000-4000-8000-000000000002",
    });
    expect(cleared.participant).toBeNull();
    expect(cleared.selectedAgencyId).toBeNull();
  });
});
