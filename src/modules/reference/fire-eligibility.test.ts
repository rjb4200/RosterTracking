import { beforeAll, describe, expect, it, vi } from "vitest";

import { encryptCredential } from "./crypto";
import {
  countFireEligible,
  fireEligibleAttendance,
  isAttendanceFireEligible,
  isFireEligibleFromSnapshots,
} from "./fire-eligibility";

beforeAll(() => {
  vi.stubEnv(
    "CREDENTIAL_ENCRYPTION_KEY",
    "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  );
});

describe("Fire eligibility", () => {
  it("uses the stored fact when the revision carries it", () => {
    const snapshot = {
      attendance: [
        { attendanceId: "eligible", fireEligible: true },
        { attendanceId: "ineligible", fireEligible: false },
      ],
    };
    expect(isAttendanceFireEligible(snapshot, "eligible")).toBe(true);
    expect(isAttendanceFireEligible(snapshot, "ineligible")).toBe(false);
    expect(fireEligibleAttendance(snapshot).map((a) => a.attendanceId)).toEqual(
      ["eligible"],
    );
    expect(countFireEligible(snapshot)).toBe(1);
  });

  it("derives eligibility from a conforming FFN credential for legacy revisions", () => {
    const valid = {
      attendance: [
        { attendanceId: "a1" },
        { attendanceId: "a2" },
        { attendanceId: "a3" },
      ],
      credentialSnapshots: [
        {
          attendanceId: "a1",
          credentialTypeCode: "ffn",
          encryptedValue: encryptCredential("1234-5678"),
        },
        {
          attendanceId: "a2",
          credentialTypeCode: "ffn",
          encryptedValue: encryptCredential("12345678"),
        },
      ],
    };
    expect(isFireEligibleFromSnapshots(valid, "a1")).toBe(true);
    expect(isFireEligibleFromSnapshots(valid, "a2")).toBe(false);
    expect(isFireEligibleFromSnapshots(valid, "a3")).toBe(false);
    expect(countFireEligible(valid)).toBe(1);
  });

  it("treats an unreadable FFN as ineligible instead of failing", () => {
    expect(
      isFireEligibleFromSnapshots(
        {
          attendance: [{ attendanceId: "a1" }],
          credentialSnapshots: [
            {
              attendanceId: "a1",
              credentialTypeCode: "ffn",
              encryptedValue: "not-a-ciphertext",
            },
          ],
        },
        "a1",
      ),
    ).toBe(false);
  });
});
