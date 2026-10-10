import { describe, expect, it } from "vitest";
import type { FinalizationSnapshot } from "@/modules/official-roster-pdfs/service";
import { encryptCredential } from "@/modules/reference/crypto";

import {
  isFireClass,
  qualifyingParticipants,
  renderTrainingNotice,
  renderTrainingNoticePage,
} from "./service";

const KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

const snapshot: FinalizationSnapshot = {
  class: {
    courseName: "Firefighter I",
    siteName: "Station 1",
    hostAgencyId: "host",
    hostAgencyName: "Winchester Fire",
    completedAt: "2026-09-05T14:00:00.000Z",
  },
  destinations: [{ code: "fire", name: "Fire Commission" }],
  signature: {
    name: "Lead Instructor",
    signedAt: "2026-09-05T18:00:00.000Z",
    attestationVersion: "roster-attestation-001",
  },
  instructors: [
    { name: "Lead Instructor", isLead: true, ffn: "111", level: null },
  ],
  components: [
    {
      title: null,
      category: "12-01",
      startsAt: "2026-09-05T13:00:00.000Z",
      endsAt: "2026-09-05T17:00:00.000Z",
      creditedHours: "4",
    },
    {
      title: null,
      category: "12-02",
      startsAt: "2026-09-05T17:00:00.000Z",
      endsAt: "2026-09-05T18:00:00.000Z",
      creditedHours: "1",
    },
  ],
  attendance: [
    {
      attendanceId: "a1",
      agencyName: "Bath Co Fire",
      agencyId: "bath",
      creditedHours: "4",
      firstName: "Bath",
      lastName: "Firefighter",
      guestFirstName: null,
      guestLastName: null,
      email: "bath@example.com",
      fireEligible: true,
    },
    {
      attendanceId: "a2",
      agencyName: "Winchester Fire",
      agencyId: "host",
      creditedHours: "4",
      firstName: "Winn",
      lastName: "Member",
      guestFirstName: null,
      guestLastName: null,
      email: "winn@example.com",
      fireEligible: true,
    },
  ],
  fieldSnapshots: [],
  credentialSnapshots: [],
};

describe("individual training notices", () => {
  it("qualifies a fire class and its outside-agency participants", () => {
    expect(isFireClass(snapshot)).toBe(true);
    expect(qualifyingParticipants(snapshot).map((p) => p.attendanceId)).toEqual(
      ["a1"],
    );
  });

  it("skips an outside-agency participant without a valid FFN", () => {
    expect(
      qualifyingParticipants({
        ...snapshot,
        attendance: snapshot.attendance.map((participant) =>
          participant.attendanceId === "a1"
            ? { ...participant, fireEligible: false }
            : participant,
        ),
      }),
    ).toEqual([]);
  });

  it("produces no notices for a non-Fire class", () => {
    expect(
      qualifyingParticipants({
        ...snapshot,
        destinations: [{ code: "kbems", name: "KBEMS" }],
      }),
    ).toEqual([]);
  });

  it("produces no notices when the revision has no host agency", () => {
    expect(
      qualifyingParticipants({
        ...snapshot,
        class: { ...snapshot.class, hostAgencyId: null },
      }),
    ).toEqual([]);
  });

  it("fills the notice fields from the revision", async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = KEY;
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const withFfn: FinalizationSnapshot = {
      ...snapshot,
      fieldSnapshots: [
        {
          attendanceId: "a1",
          studentField: "ffn",
          encryptedValue: encryptCredential("12345"),
        },
      ],
    };
    const page = await renderTrainingNoticePage("white", withFfn, participant, {
      flatten: false,
    });
    const form = page.getForm();
    expect(form.getTextField("FF_Name").getText()).toBe("Bath Firefighter");
    expect(form.getTextField("FFN").getText()).toBe("12345");
    expect(form.getTextField("Instructor_Name").getText()).toBe(
      "Lead Instructor",
    );
    expect(form.getTextField("Instructor_FFN").getText()).toBe("111");
    expect(form.getTextField("Row_1_Category_Code").getText()).toBe("12-01");
    expect(form.getTextField("Row_1_Hours").getText()).toBe("4");
    expect(form.getTextField("Row_2_Category_Code").getText()).toBe("12-02");
    expect(form.getTextField("Total_Hours").getText()).toBe("5");
    expect(form.getTextField("Instructor_Signature").getText()).toBe(
      "Lead Instructor",
    );
    expect(form.getTextField("Agency_Selection").getText() ?? "").toBe("");
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  });

  it("renders a notice for a host-agency participant", async () => {
    const hostParticipant = snapshot.attendance[1];
    if (!hostParticipant) throw new Error("fixture participant is missing");
    expect(
      qualifyingParticipants(snapshot).some(
        (p) => p.attendanceId === hostParticipant.attendanceId,
      ),
    ).toBe(false);
    const bytes = await renderTrainingNotice(
      "lightYellow",
      snapshot,
      hostParticipant,
    );
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it("renders the yellow and white variants as different documents", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const [yellow, white] = await Promise.all([
      renderTrainingNotice("lightYellow", snapshot, participant),
      renderTrainingNotice("white", snapshot, participant),
    ]);
    expect(yellow.byteLength).toBeGreaterThan(0);
    expect(Buffer.from(yellow).equals(Buffer.from(white))).toBe(false);
  });

  it("aligns the flagged fields to their printed cells", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderTrainingNoticePage(
      "white",
      snapshot,
      participant,
      {
        flatten: false,
      },
    );
    const form = page.getForm();
    const x = (name: string) =>
      form.getTextField(name).acroField.getWidgets()[0]?.getRectangle().x;
    expect(x("FF_Name")).toBeCloseTo(72, 1);
    expect(x("Instructor_Name")).toBeCloseTo(72, 1);
    expect(x("Row_1_Hours")).toBeCloseTo(108, 1);
    expect(x("Row_1_Category_Code")).toBeCloseTo(148.5, 1);
  });
});
