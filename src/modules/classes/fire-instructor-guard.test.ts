import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Database, DatabaseTransaction } from "@/server/db/client";

const guard = vi.hoisted(() => vi.fn());
vi.mock("./instructor-ffn", () => ({ requireFireInstructorFfns: guard }));

import {
  assignClassInstructor,
  createOpenClass,
  updateClass,
} from "./services";

const leadId = "00000000-0000-4000-8000-000000000001";
const assistantId = "00000000-0000-4000-8000-000000000002";
const fireId = "00000000-0000-4000-8000-000000000003";
const agencyId = "00000000-0000-4000-8000-000000000004";
const classId = "00000000-0000-4000-8000-000000000005";
const actor = { id: leadId, username: "instructor" };
const details = {
  name: "Fire training",
  hostAgencyId: agencyId,
  deliveryMethod: "online" as const,
  reportingSystemIds: [fireId],
};

function databaseWithSelections(selections: unknown[][]) {
  const pending = [...selections];
  const transaction = {
    select: vi.fn(() => {
      const rows = pending.shift();
      if (!rows) throw new Error("Unexpected database read.");
      const query = Object.assign(Promise.resolve(rows), {
        from: () => query,
        where: () => query,
        innerJoin: () => query,
        limit: () => query,
        for: () => query,
      });
      return query;
    }),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const db = {
    transaction: (callback: (tx: DatabaseTransaction) => Promise<unknown>) =>
      callback(transaction as unknown as DatabaseTransaction),
  } as unknown as Database;
  return { db, transaction };
}

describe("Fire class instructor mutation guards", () => {
  beforeEach(() => {
    guard.mockReset();
    guard.mockRejectedValue(
      new Error("Update the staff profile FFN: 0000-0000."),
    );
  });

  it("rejects creating a Fire class before any rows are inserted", async () => {
    const { db, transaction } = databaseWithSelections([
      [{ id: agencyId }],
      [{ id: fireId }],
      [{ code: "fire" }],
      [],
      [{ id: leadId }],
      [{ id: fireId }],
    ]);
    await expect(
      createOpenClass(db, actor, {
        ...details,
        startsAt: "2026-10-10T09:00:00Z",
        creditedHours: 2,
        leadInstructorId: leadId,
      }),
    ).rejects.toThrow(/staff profile FFN/);
    expect(guard).toHaveBeenCalledWith(transaction, [leadId]);
    expect(transaction.insert).not.toHaveBeenCalled();
  });

  it("checks every assigned instructor before adding Fire reporting", async () => {
    const { db, transaction } = databaseWithSelections([
      [{ id: classId, status: "open" }],
      [{ id: "elevated-role" }],
      [{ id: agencyId }],
      [{ id: fireId }],
      [{ code: "fire" }],
      [{ id: fireId }],
      [],
      [{ id: leadId }, { id: assistantId }],
    ]);
    await expect(updateClass(db, actor, classId, details)).rejects.toThrow(
      /staff profile FFN/,
    );
    expect(guard).toHaveBeenCalledWith(transaction, [leadId, assistantId]);
    expect(transaction.update).not.toHaveBeenCalled();
    expect(transaction.delete).not.toHaveBeenCalled();
  });

  it("rejects an assisting assignment without changing existing assignments", async () => {
    const { db, transaction } = databaseWithSelections([
      [{ id: classId, status: "open" }],
      [{ id: "elevated-role" }],
      [{ id: assistantId }],
      [],
      [{ id: fireId }],
      [{ id: leadId }],
    ]);
    await expect(
      assignClassInstructor(db, actor, classId, assistantId, false),
    ).rejects.toThrow(/staff profile FFN/);
    expect(guard).toHaveBeenCalledWith(transaction, [leadId, assistantId]);
    expect(transaction.update).not.toHaveBeenCalled();
    expect(transaction.insert).not.toHaveBeenCalled();
  });

  it("does not impose an FFN requirement on non-Fire instructor assignments", async () => {
    const { db, transaction } = databaseWithSelections([
      [{ id: classId, status: "open" }],
      [{ id: "elevated-role" }],
      [{ id: assistantId }],
      [],
      [],
    ]);
    const write = Object.assign(Promise.resolve([]), {
      values: () => write,
      onConflictDoUpdate: () => write,
    });
    transaction.insert.mockReturnValue(write);
    await expect(
      assignClassInstructor(db, actor, classId, assistantId, false),
    ).resolves.toBeUndefined();
    expect(guard).not.toHaveBeenCalled();
  });
});
