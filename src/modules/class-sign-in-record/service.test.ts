import { describe, expect, it } from "vitest";

import { buildClassSignInRecordFromSnapshot } from "./service";

describe("class sign-in record snapshot", () => {
  it("restores dates from a stored finalization snapshot", () => {
    const entry = {
      attendanceId: "attendance-1",
      participantName: "Snapshot Student",
      participantType: "regular" as const,
      agencyName: "Example Fire",
      signInMethod: "current_phone",
      creditedHours: "8",
      signedInAt: "2026-09-10T13:00:00.000Z",
      attestation: {
        renderedText: "I attended this class day.",
        textVersion: 1,
        confirmedAt: "2026-09-10T13:05:00.000Z",
        originatingIp: "203.0.113.10",
        rememberedDeviceId: null,
      },
    };
    const record = buildClassSignInRecordFromSnapshot({
      signInRecord: {
        classId: "class-1",
        courseName: "Snapshot Course",
        siteName: null,
        hostAgencyName: "Example Fire",
        deliveryMethod: "classroom",
        generatedAt: "2026-09-10T14:00:00.000Z",
        active: [entry],
        removed: [],
        days: [{ date: "2026-09-10", entries: [entry] }],
      },
      components: [],
    });

    expect(record?.generatedAt).toBeInstanceOf(Date);
    expect(record?.active[0]?.signedInAt).toBeInstanceOf(Date);
    expect(record?.active[0]?.attestation?.confirmedAt).toBeInstanceOf(Date);
    expect(record?.days?.[0]?.entries[0]?.signedInAt).toBeInstanceOf(Date);
  });
});
