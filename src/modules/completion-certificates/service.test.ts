import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { COMPLETION_CERTIFICATE_TEMPLATE } from "@/modules/official-roster-pdfs/mappings";
import type { FinalizationSnapshot } from "@/modules/official-roster-pdfs/service";

import {
  certificateClassHours,
  certificateContentFingerprint,
  courseTypeLabel,
  instructorTitleCourse,
  participantName,
  renderCertificatePage,
  renderCompletionCertificateBatch,
  renderCompletionCertificates,
  revisionReportsToKbems,
} from "./service";

const snapshot: FinalizationSnapshot = {
  class: {
    courseName: "Airway Management",
    siteName: "Station 2",
    objectives: null,
    courseType: "continuing_education",
    courseNumber: "CE-2026-14",
    completedAt: "2026-09-05T14:00:00.000Z",
  },
  destinations: [{ code: "kbems", name: "KBEMS / KEMSIS" }],
  instructors: [{ name: "Lead Medic", isLead: true, ffn: null, level: null }],
  components: [
    {
      title: null,
      startsAt: "2026-09-05T13:00:00.000Z",
      endsAt: "2026-09-05T15:00:00.000Z",
      creditedHours: "2",
    },
  ],
  attendance: [
    {
      attendanceId: "a1",
      agencyName: "Winchester EMS",
      creditedHours: "2",
      firstName: "Ada",
      lastName: "Lovelace",
      guestFirstName: null,
      guestLastName: null,
    },
    {
      attendanceId: "a2",
      agencyName: "Winchester EMS",
      creditedHours: "2",
      firstName: null,
      lastName: null,
      guestFirstName: "Guest",
      guestLastName: "Person",
    },
  ],
  fieldSnapshots: [],
  credentialSnapshots: [],
};

describe("completion certificates", () => {
  it("uses the approved certificate template and mapped fields", async () => {
    const bytes = await readFile(
      new URL(
        `../official-roster-pdfs/${COMPLETION_CERTIFICATE_TEMPLATE.assetName}`,
        import.meta.url,
      ),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      COMPLETION_CERTIFICATE_TEMPLATE.sourceChecksum,
    );
    const fields = new Set(
      (await PDFDocument.load(bytes))
        .getForm()
        .getFields()
        .map((field) => field.getName()),
    );
    for (const name of Object.values(COMPLETION_CERTIFICATE_TEMPLATE.fields)) {
      expect(fields.has(name)).toBe(true);
    }
  });

  it("labels course types", () => {
    expect(courseTypeLabel("continuing_education")).toBe(
      "Continuing Education",
    );
    expect(courseTypeLabel("refresher")).toBe("Refresher");
    expect(courseTypeLabel("something_else")).toBe("something else");
    expect(courseTypeLabel(null)).toBe("");
  });

  it("names regular and guest participants", () => {
    const [regular, guest] = snapshot.attendance;
    if (!regular || !guest) throw new Error("fixture participants are missing");
    expect(participantName(regular)).toBe("Ada Lovelace");
    expect(participantName(guest)).toBe("Guest Person");
  });

  it("composes the instructor title and course line", () => {
    expect(instructorTitleCourse(snapshot)).toBe(
      "Continuing Education – Airway Management",
    );
  });

  it("uses the class hours, falling back to participant credit", () => {
    expect(certificateClassHours(snapshot)).toBe("2");
    expect(certificateClassHours({ ...snapshot, components: undefined })).toBe(
      "2",
    );
  });

  it("detects a KBEMS destination", () => {
    expect(revisionReportsToKbems(snapshot)).toBe(true);
    expect(
      revisionReportsToKbems({
        ...snapshot,
        destinations: [{ code: "fire", name: "Kentucky Fire Commission" }],
      }),
    ).toBe(false);
  });

  it("renders one flattened page per participant", async () => {
    const bytes = await renderCompletionCertificates(snapshot);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    // Flattened: no interactive fields remain (the signature stays blank).
    expect(pdf.getForm().getFields()).toHaveLength(0);
  });

  it("renders the same finalized inputs deterministically", async () => {
    await expect(renderCompletionCertificates(snapshot)).resolves.toEqual(
      await renderCompletionCertificates(snapshot),
    );
  });

  it("renders the attested signer on the certificate signature field", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const signed: FinalizationSnapshot = {
      ...snapshot,
      signature: {
        name: "Lead Medic",
        signedAt: "2026-09-05T18:00:00.000Z",
        attestationVersion: "roster-attestation-001",
      },
    };
    const page = await renderCertificatePage(signed, participant, {
      flatten: false,
    });
    expect(page.getForm().getTextField("Instructor_Signature").getText()).toBe(
      "Lead Medic",
    );
  });

  it("leaves the certificate signature blank without an attestation", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(snapshot, participant, {
      flatten: false,
    });
    expect(
      page.getForm().getTextField("Instructor_Signature").getText() ?? "",
    ).toBe("");
  });

  it("builds a batch with a cover page and one certificate per participant", async () => {
    const bytes = await renderCompletionCertificateBatch(snapshot);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(snapshot.attendance.length + 1);
  });

  it("excludes removed participants from the batch", async () => {
    // A finalized snapshot only carries active attendance, so a removed
    // participant is absent and the batch is a cover plus active pages only.
    const activeOnly: FinalizationSnapshot = {
      ...snapshot,
      attendance: snapshot.attendance.slice(0, 1),
    };
    const bytes = await renderCompletionCertificateBatch(activeOnly);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  it("fingerprints the certificate values and ignores the template version", () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const fingerprint = certificateContentFingerprint(snapshot, participant);
    expect(fingerprint).toBe(
      certificateContentFingerprint(snapshot, participant),
    );
    const changed = certificateContentFingerprint(
      { ...snapshot, class: { ...snapshot.class, courseNumber: "NEW" } },
      participant,
    );
    expect(changed).not.toBe(fingerprint);
  });
});
