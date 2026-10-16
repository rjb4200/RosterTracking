import { describe, expect, it, vi } from "vitest";

import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  classComponents,
  classMtuUsageItems,
  trainingClasses,
} from "@/server/db/schema";

import {
  confirmMtuUsageForFinalization,
  createOpenClass,
  updateClass,
  updateClassMtuUsage,
} from "./services";

const classId = "00000000-0000-4000-8000-000000000001";
const van = "00000000-0000-4000-8000-000000000002";
const department = "00000000-0000-4000-8000-000000000003";
const pov = "00000000-0000-4000-8000-000000000004";
const actor = {
  id: "00000000-0000-4000-8000-000000000005",
  username: "instructor",
};
const agency = "00000000-0000-4000-8000-000000000006";
const system = "00000000-0000-4000-8000-000000000007";
const catalog = [
  {
    id: van,
    name: "Van",
    kind: "transport",
    isActive: true,
    requiresMileage: true,
  },
  {
    id: department,
    name: "Department vehicle",
    kind: "transport",
    isActive: true,
    requiresMileage: true,
  },
  {
    id: pov,
    name: "POV",
    kind: "transport",
    isActive: true,
    requiresMileage: false,
  },
];
const draft = {
  name: "MTU",
  deliveryMethod: "online" as const,
  hostAgencyId: agency,
  reportingSystemIds: [system],
};

function fixture(reads: unknown[][]) {
  const pending = [...reads];
  const writes: { table: unknown; values: unknown }[] = [];
  const tx = {
    select: vi.fn(() => {
      const rows = pending.shift();
      if (!rows) throw new Error("Unexpected database read");
      const query = Object.assign(Promise.resolve(rows), {
        from: () => query,
        where: () => query,
        innerJoin: () => query,
        limit: () => query,
        for: () => query,
      });
      return query;
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ table, values });
        return Object.assign(Promise.resolve(), {
          onConflictDoUpdate: () => Promise.resolve(),
          returning: () =>
            Promise.resolve(
              table === trainingClasses
                ? [{ id: classId }]
                : table === classComponents
                  ? [{ id: "component" }]
                  : [],
            ),
        });
      },
    }),
    delete: () => ({ where: () => Promise.resolve() }),
    update: () => ({
      set: () => ({
        where: () =>
          Object.assign(Promise.resolve(), {
            returning: () => Promise.resolve([{ id: classId }]),
          }),
      }),
    }),
  } as unknown as DatabaseTransaction;
  const db = {
    transaction: (callback: (tx: DatabaseTransaction) => unknown) =>
      callback(tx),
  } as unknown as Database;
  return {
    db,
    tx,
    writes,
    items: () =>
      writes.find((write) => write.table === classMtuUsageItems)?.values,
  };
}

function creationReads() {
  return [
    [{ id: agency }],
    [{ id: system }],
    [],
    [{ id: actor.id }],
    [],
    [],
    catalog,
  ];
}

describe("per-transport mileage services", () => {
  it("requires each selected driving vehicle's own mileage, not the legacy text", async () => {
    const { db } = fixture(creationReads());
    await expect(
      createOpenClass(db, actor, {
        ...draft,
        startsAt: "2026-10-10T09:00:00Z",
        creditedHours: 2,
        leadInstructorId: actor.id,
        mtuTransportIds: [van, department],
        mtuMileage: "999",
        mtuTransportMileage: { [van]: "120" },
      }),
    ).rejects.toThrow(/Department vehicle/);
  });

  it("stores separate creation estimates and optional POV mileage", async () => {
    const test = fixture([...creationReads(), catalog, [{ count: 0 }]]);
    await createOpenClass(test.db, actor, {
      ...draft,
      startsAt: "2026-10-10T09:00:00Z",
      creditedHours: 2,
      leadInstructorId: actor.id,
      mtuTransportIds: [van, department, pov],
      mtuTransportMileage: { [van]: "120.5", [department]: "0", [pov]: "15" },
    });
    expect(test.items()).toEqual([
      expect.objectContaining({ itemId: van, mileage: "120.5" }),
      expect.objectContaining({ itemId: department, mileage: "0" }),
      expect.objectContaining({ itemId: pov, mileage: "15" }),
    ]);
  });

  it("allows blank mileage on later class edits", async () => {
    const test = fixture([
      [{ id: classId, status: "open", createdByUserId: actor.id }],
      [],
      [{ id: agency }],
      [{ id: system }],
      [],
      catalog,
      [{ count: 0 }],
    ]);
    await updateClass(test.db, actor, classId, {
      ...draft,
      mtuTransportIds: [van],
      mtuTransportMileage: { [van]: "" },
    });
    expect(test.items()).toEqual([
      expect.objectContaining({ itemId: van, mileage: null }),
    ]);
  });

  it("keeps finalized usage editable and ignores mileage for deselected vehicles", async () => {
    const test = fixture([
      [{ id: classId, status: "finalized", createdByUserId: actor.id }],
      [],
      catalog,
      [{ count: 0 }],
    ]);
    await updateClassMtuUsage(test.db, actor, classId, {
      transportIds: [pov, pov],
      transportMileage: { [pov]: "42.25", [van]: "invalid" },
    });
    expect(test.items()).toEqual([
      expect.objectContaining({ itemId: pov, mileage: "42.25" }),
    ]);
  });

  it("accepts clearing mileage during finalization without imposing creation requirements", async () => {
    const test = fixture([catalog, [{ count: 1 }], []]);
    await confirmMtuUsageForFinalization(test.tx, classId, {
      equipmentIds: [],
      supplies: [],
      transportIds: [van, pov],
      transportMileage: { [van]: "", [pov]: "18" },
    });
    expect(test.items()).toEqual([
      expect.objectContaining({ itemId: van, mileage: null }),
      expect.objectContaining({ itemId: pov, mileage: "18" }),
    ]);
  });

  it("rejects invalid selected mileage rather than storing NaN or negative values", async () => {
    const test = fixture([catalog, [{ count: 0 }]]);
    await expect(
      confirmMtuUsageForFinalization(test.tx, classId, {
        equipmentIds: [],
        supplies: [],
        transportIds: [van],
        transportMileage: { [van]: "-1" },
      }),
    ).rejects.toThrow(/non-negative/);
  });
});
