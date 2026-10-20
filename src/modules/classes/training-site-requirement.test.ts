import { describe, expect, it } from "vitest";

import type { Database } from "@/server/db/client";

import { createOpenClass } from "./services";

const DELIVERY_COMBINATIONS = [
  "classroom",
  "hands_on",
  "online",
  "classroom,hands_on",
  "classroom,online",
  "hands_on,online",
  "classroom,hands_on,online",
] as const;

const base = {
  name: "Site required",
  trainingSiteId: "",
  hostAgencyId: "00000000-0000-4000-8000-000000000001",
  startsAt: "2026-10-10T09:00",
  creditedHours: 2,
  leadInstructorId: "00000000-0000-4000-8000-000000000002",
  reportingSystemIds: ["00000000-0000-4000-8000-000000000003"],
};

describe("training site requirement", () => {
  it.each(DELIVERY_COMBINATIONS)(
    "rejects a class without a site for %s",
    async (deliveryMethod) => {
      await expect(
        createOpenClass(
          {} as Database,
          { id: "actor", username: "actor" },
          { ...base, deliveryMethod },
        ),
      ).rejects.toThrow(/trainingSiteId/);
    },
  );
});
