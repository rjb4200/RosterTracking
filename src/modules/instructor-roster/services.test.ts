import { describe, expect, it } from "vitest";

import {
  CREDIT_ADJUSTMENT_REASONS,
  hasElevatedRosterAccess,
  participantLabel,
  participantsFollowingRaisedTotal,
  readinessIssue,
  validateCreditedHours,
} from "./services";

describe("instructor roster policy", () => {
  it("allows scheduled credit and requires a reason for an adjustment", () => {
    expect(() => validateCreditedHours(4, 4)).not.toThrow();
    expect(() => validateCreditedHours(3.5, 4)).toThrow(/reason/i);
    expect(() => validateCreditedHours(3.5, 4, "Left early")).not.toThrow();
  });

  it("rejects credit outside the scheduled total", () => {
    expect(() => validateCreditedHours(-0.01, 4, "Incorrect")).toThrow(
      /between zero/i,
    );
    expect(() => validateCreditedHours(4.01, 4, "Incorrect")).toThrow(
      /between zero/i,
    );
  });

  it("grants department roster access only to elevated roles", () => {
    expect(hasElevatedRosterAccess(["administrator"])).toBe(true);
    expect(hasElevatedRosterAccess(["training-major"])).toBe(true);
    expect(hasElevatedRosterAccess(["instructor"])).toBe(false);
  });

  it("offers the guided adjustment reasons", () => {
    expect(CREDIT_ADJUSTMENT_REASONS).toEqual([
      "Late Arrival",
      "Left Early",
      "Partial Attendance",
      "Instructor Adjustment",
      "Other",
    ]);
  });

  it("carries a raised scheduled total to participants at the previous total", () => {
    const participants = [
      { id: "a", creditedHours: "5" },
      { id: "c", creditedHours: "5" },
    ];
    expect(participantsFollowingRaisedTotal(participants, 5, 7)).toEqual([
      "a",
      "c",
    ]);
  });

  it("leaves a participant adjusted below the previous total alone", () => {
    const participants = [
      { id: "a", creditedHours: "5" },
      { id: "b", creditedHours: "2" },
    ];
    expect(participantsFollowingRaisedTotal(participants, 5, 7)).toEqual(["a"]);
  });

  it("does not carry participants when the total is not raised", () => {
    const participants = [{ id: "a", creditedHours: "5" }];
    expect(participantsFollowingRaisedTotal(participants, 5, 5)).toEqual([]);
    expect(participantsFollowingRaisedTotal(participants, 5, 4)).toEqual([]);
  });

  it("names a readiness issue by the participant, not the record id", () => {
    const name = participantLabel({
      studentId: "student-1",
      firstName: "Ada",
      lastName: "Lovelace",
      guestFirstName: null,
      guestLastName: null,
    });
    expect(name).toBe("Ada Lovelace");
    const issue = readinessIssue(name, "credit");
    expect(issue).toContain("Ada Lovelace");
    expect(issue).not.toContain("student-1");
  });

  it("labels a guest participant by their name", () => {
    expect(
      participantLabel({
        studentId: null,
        firstName: null,
        lastName: null,
        guestFirstName: "Guest",
        guestLastName: "Person",
      }),
    ).toBe("Guest Person");
    expect(readinessIssue("Guest Person", "context")).toContain("Guest Person");
  });
});
