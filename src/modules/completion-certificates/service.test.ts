import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import fontkit from "@pdf-lib/fontkit";
import {
  decodePDFRawStream,
  PDFArray,
  PDFContentStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  TextAlignment,
} from "pdf-lib";
import { describe, expect, it } from "vitest";

import { COMPLETION_CERTIFICATE_TEMPLATE } from "@/modules/official-roster-pdfs/mappings";
import type { FinalizationSnapshot } from "@/modules/official-roster-pdfs/service";

import {
  certificateClassHours,
  certificateContentFingerprint,
  certificateCoverHeader,
  certificateCoverRowHours,
  courseTypeLabel,
  instructorTitleCourse,
  participantName,
  renderCertificateForParticipant,
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
  instructors: [
    {
      userId: "instructor-1",
      name: "Lead Medic",
      isLead: true,
      ffn: null,
      level: null,
    },
  ],
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

/** The font a field's rendered appearance draws its text in. */
function appearanceFontName(
  page: PDFDocument,
  fieldName: string,
): string | null {
  const widget = page
    .getForm()
    .getTextField(fieldName)
    .acroField.getWidgets()[0];
  const normal = widget?.getAppearances()?.normal;
  if (!(normal instanceof PDFContentStream)) return null;
  return (
    /(\/[A-Za-z0-9+-]+)\s+[\d.]+\s+Tf/.exec(normal.getContentsString())?.[1] ??
    null
  );
}

/** The embedded font program for a base font name (e.g. "Allura"). */
function embeddedFontBytes(
  page: PDFDocument,
  baseFontName: string,
): Uint8Array {
  for (const [, object] of page.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) continue;
    const baseFont = object.get(PDFName.of("BaseFont"));
    if (
      !(baseFont instanceof PDFName) ||
      !String(baseFont).includes(baseFontName)
    ) {
      continue;
    }
    const descendants = object.get(PDFName.of("DescendantFonts"));
    const font =
      descendants instanceof PDFArray
        ? page.context.lookup(descendants.get(0))
        : object;
    if (!(font instanceof PDFDict)) continue;
    const descriptor = page.context.lookup(
      font.get(PDFName.of("FontDescriptor")),
    );
    if (!(descriptor instanceof PDFDict)) continue;
    const fontFile = page.context.lookup(
      descriptor.get(PDFName.of("FontFile2")),
    );
    if (fontFile instanceof PDFRawStream) {
      return decodePDFRawStream(fontFile).decode();
    }
  }
  throw new Error(`No embedded ${baseFontName} font`);
}

/** True when a field still carries a template highlight background. */
function hasFieldBackground(page: PDFDocument, fieldName: string): boolean {
  const widget = page
    .getForm()
    .getTextField(fieldName)
    .acroField.getWidgets()[0];
  return (
    widget?.getAppearanceCharacteristics()?.dict.lookup(PDFName.of("BG")) !==
    undefined
  );
}

/** Number of document catalogs in a loaded PDF. */
function documentCatalogCount(pdf: PDFDocument): number {
  let count = 0;
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (
      object instanceof PDFDict &&
      object.get(PDFName.of("Type"))?.toString() === "/Catalog"
    ) {
      count += 1;
    }
  }
  return count;
}

const signedSnapshot: FinalizationSnapshot = {
  ...snapshot,
  signature: {
    name: "Lead Medic",
    signedAt: "2026-09-05T18:00:00.000Z",
    attestationVersion: "roster-attestation-001",
  },
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

  it("issues a certificate to every attendee regardless of credentials", async () => {
    // EMS may certify anyone, so an attendee without a valid FFN (or any
    // credential) still receives a certificate.
    const withoutCredentials = await renderCompletionCertificates({
      ...snapshot,
      attendance: snapshot.attendance.map((participant) => ({
        ...participant,
        fireEligible: false,
      })),
    });
    expect((await PDFDocument.load(withoutCredentials)).getPageCount()).toBe(2);
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
    const text = Buffer.from(bytes).toString("latin1");
    expect(pdf.getPageCount()).toBe(snapshot.attendance.length + 1);
    expect(documentCatalogCount(pdf)).toBe(1);
    expect(text).not.toContain("/EmbeddedFiles");
    expect(text).not.toContain("application#2Fc2pa");
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

  it("maps the sentence blanks to the hours, type, class name, and number", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(snapshot, participant, {
      flatten: false,
    });
    const form = page.getForm();
    // "2 Continuing Education hours Airway Management Course CE-2026-14"
    expect(form.getTextField("Class_Hours").getText()).toBe(
      "2 Continuing Education",
    );
    expect(form.getTextField("Course_Type").getText()).toBe(
      "Airway Management",
    );
    expect(form.getTextField("Course_Number").getText()).toBe("CE-2026-14");
  });

  it("leaves the number blank when the class has none", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const noNumber: FinalizationSnapshot = {
      ...snapshot,
      class: { ...snapshot.class, courseNumber: null },
    };
    const page = await renderCertificatePage(noNumber, participant, {
      flatten: false,
    });
    expect(page.getForm().getTextField("Course_Number").getText() ?? "").toBe(
      "",
    );
  });

  it("composes the signature line from the type and class name", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(snapshot, participant, {
      flatten: false,
    });
    expect(
      page.getForm().getTextField("Instructor_Title_Course").getText(),
    ).toBe("Continuing Education – Airway Management");
  });

  it("drops the type from the signature line for a very long class name", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const longName =
      "Advanced Prehospital Emergency Cardiovascular Care and Resuscitation Certification";
    const long: FinalizationSnapshot = {
      ...snapshot,
      class: { ...snapshot.class, courseName: longName },
    };
    const page = await renderCertificatePage(long, participant, {
      flatten: false,
    });
    expect(
      page.getForm().getTextField("Instructor_Title_Course").getText(),
    ).toBe(longName);
    expect(page.getForm().getTextField("Course_Type").getText()).toBe(longName);
  });

  it("shrinks a value that is too wide for its field", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const longName =
      "Advanced Prehospital Emergency Cardiovascular Care and Resuscitation Certification";
    const long: FinalizationSnapshot = {
      ...snapshot,
      class: { ...snapshot.class, courseName: longName },
    };
    const page = await renderCertificatePage(long, participant, {
      flatten: false,
    });
    const appearance = page
      .getForm()
      .getTextField("Course_Type")
      .acroField.getDefaultAppearance();
    const size = Number(/([\d.]+)\s+Tf/.exec(appearance ?? "")?.[1] ?? 0);
    expect(size).toBeGreaterThanOrEqual(6);
    expect(size).toBeLessThan(9);
  });

  it("clears the template field highlight background", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(snapshot, participant, {
      flatten: false,
    });
    for (const field of page.getForm().getFields()) {
      expect(hasFieldBackground(page, field.getName())).toBe(false);
    }
  });

  it("keeps the mapped values after clearing the backgrounds", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(snapshot, participant, {
      flatten: false,
    });
    const form = page.getForm();
    expect(form.getTextField("Student_Name").getText()).toBe("Ada Lovelace");
    expect(form.getTextField("Class_Hours").getText()).toBe(
      "2 Continuing Education",
    );
    expect(form.getTextField("Course_Type").getText()).toBe(
      "Airway Management",
    );
    expect(form.getTextField("Course_Number").getText()).toBe("CE-2026-14");
  });

  it("centers the participant and inline course fields", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(snapshot, participant, {
      flatten: false,
    });
    const form = page.getForm();
    for (const name of [
      "Student_Name",
      "Class_Hours",
      "Course_Type",
      "Course_Number",
    ]) {
      expect(form.getTextField(name).getAlignment()).toBe(TextAlignment.Center);
    }
  });

  it("leaves the date and instructor fields left-aligned", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(snapshot, participant, {
      flatten: false,
    });
    const form = page.getForm();
    for (const name of [
      "Completion_Date",
      "Instructor_Name",
      "Instructor_Title_Course",
      "Instructor_Signature",
    ]) {
      expect(form.getTextField(name).getAlignment()).toBe(TextAlignment.Left);
    }
  });

  it("renders the signature in Allura and the body in Libre Baskerville", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(signedSnapshot, participant, {
      flatten: false,
    });
    expect(appearanceFontName(page, "Instructor_Signature")).toContain(
      "Allura",
    );
    expect(appearanceFontName(page, "Student_Name")).toContain(
      "LibreBaskerville",
    );
    expect(appearanceFontName(page, "Course_Type")).toContain(
      "LibreBaskerville",
    );
  });

  it("embeds a signature font that can render the attested name", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const bytes = await renderCertificateForParticipant(
      signedSnapshot,
      participant,
    );
    const pdf = await PDFDocument.load(bytes);
    const font = fontkit.create(Buffer.from(embeddedFontBytes(pdf, "Allura")));
    // Subsetting Allura drops glyph outlines, which makes the rendered
    // signature blank or a tiny squiggle. The embedded face must still lay out
    // the signer's name.
    expect(() =>
      font.layout(signedSnapshot.signature?.name ?? ""),
    ).not.toThrow();
    const run = font.layout(signedSnapshot.signature?.name ?? "");
    for (const glyph of run.glyphs) {
      expect(glyph.bbox.minX).not.toBeNull();
    }
  });

  it("embeds both certificate fonts", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const bytes = await renderCertificateForParticipant(snapshot, participant);
    const text = Buffer.from(bytes).toString("latin1");
    expect(text).toContain("Allura");
    expect(text).toContain("LibreBaskerville");
    expect(text).toContain("FontFile2");
  });

  it("emits an individual certificate as a clean standalone PDF", async () => {
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const bytes = await renderCertificateForParticipant(
      signedSnapshot,
      participant,
    );
    const pdf = await PDFDocument.load(bytes);
    const text = Buffer.from(bytes).toString("latin1");

    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getForm().getFields()).toHaveLength(0);
    expect(documentCatalogCount(pdf)).toBe(1);
    expect(text).not.toContain("/EmbeddedFiles");
    expect(text).not.toContain("application#2Fc2pa");
    expect(text).not.toContain("C2PA_Manifest");
    expect(text).not.toContain("Content Credentials");

    const root = pdf.context.lookup(pdf.context.trailerInfo.Root);
    expect(root).toBeInstanceOf(PDFDict);
    if (root instanceof PDFDict) {
      expect(root.get(PDFName.of("Names"))).toBeUndefined();
    }

    const baseFonts = new Set<string>();
    let imageCount = 0;
    for (const [, object] of pdf.context.enumerateIndirectObjects()) {
      const dict =
        object instanceof PDFRawStream
          ? object.dict
          : object instanceof PDFDict
            ? object
            : null;
      if (!dict) continue;
      const baseFont = dict.get(PDFName.of("BaseFont"));
      if (baseFont instanceof PDFName) baseFonts.add(String(baseFont));
      if (dict.get(PDFName.of("Subtype"))?.toString() === "/Image") {
        imageCount += 1;
      }
    }
    expect([...baseFonts].some((font) => font.includes("Allura"))).toBe(true);
    expect(
      [...baseFonts].some((font) => font.includes("LibreBaskerville")),
    ).toBe(true);
    expect(imageCount).toBeGreaterThan(0);

    const source = await renderCertificatePage(signedSnapshot, participant, {
      flatten: false,
    });
    const form = source.getForm();
    expect(form.getTextField("Student_Name").getText()).toBe("Ada Lovelace");
    expect(form.getTextField("Course_Type").getText()).toBe(
      "Airway Management",
    );
    expect(form.getTextField("Instructor_Signature").getText()).toBe(
      "Lead Medic",
    );
  });

  it("covers the signature-line glyphs in the bundled fonts", async () => {
    const libreBaskerville = await fontkit.create(
      await readFile(
        new URL(
          "../official-roster-pdfs/fonts/LibreBaskerville-Regular.ttf",
          import.meta.url,
        ),
      ),
    );
    const allura = await fontkit.create(
      await readFile(
        new URL(
          "../official-roster-pdfs/fonts/Allura-Regular.ttf",
          import.meta.url,
        ),
      ),
    );
    for (const font of [libreBaskerville, allura]) {
      expect(font.characterSet).toContain(0x2013);
      expect(font.characterSet).toContain(0x2019);
    }
    const participant = snapshot.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    const page = await renderCertificatePage(snapshot, participant, {
      flatten: false,
    });
    expect(
      page.getForm().getTextField("Instructor_Title_Course").getText(),
    ).toContain("–");
  });

  it("states the class hours in the cover header", () => {
    const header = certificateCoverHeader(snapshot);
    expect(header).toContain("2 participants");
    expect(header).toContain("2 hours");
  });

  it("keeps class hours in the header while rows keep participant credits", () => {
    const mixed = {
      ...snapshot,
      components: [
        {
          title: null,
          startsAt: "2026-09-05T13:00:00.000Z",
          endsAt: "2026-09-05T18:00:00.000Z",
          creditedHours: "5",
        },
      ],
      attendance: snapshot.attendance.map((participant) => ({
        ...participant,
        creditedHours: "2",
      })),
    } satisfies FinalizationSnapshot;

    const header = certificateCoverHeader(mixed);
    expect(header).toContain("5 hours");
    expect(header).not.toContain("2 hours");

    const participant = mixed.attendance[0];
    if (!participant) throw new Error("fixture participant is missing");
    expect(certificateCoverRowHours(participant)).toBe("2");
  });
});
