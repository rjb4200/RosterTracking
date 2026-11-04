import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  decodePDFRawStream,
  PDFArray,
  PDFContentStream,
  PDFDict,
  PDFDocument,
  PDFName,
  type PDFPage,
  PDFRawStream,
} from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";

import { encryptCredential } from "@/modules/reference/crypto";
import type { Database } from "@/server/db/client";

import {
  getTemplateMapping,
  KBEMS_E16_TEMPLATE,
  TEMPLATE_MAPPINGS,
} from "./mappings";
import {
  emailOfficialRoster,
  type FinalizationSnapshot,
  generateOfficialRoster,
  hasOfficialRosterAuthority,
  kbemsE16Signatures,
  renderKbemsE16Page,
  renderKbemsE16Roster,
  renderOfficialRoster,
  renderPage,
  renderRosterPage,
  snapshotIdentifier,
  UnreadableRevisionSnapshotError,
  validateOfficialRosterRecipient,
} from "./service";

const snapshot: FinalizationSnapshot = {
  class: {
    courseName: "Incident Command",
    siteName: "Station 1",
    completedAt: "2026-09-05T14:00:00.000Z",
  },
  instructors: [
    { userId: "instructor-1", name: "Lead Instructor", isLead: true },
    { userId: "instructor-2", name: "Assistant Instructor", isLead: false },
  ],
  components: [
    {
      title: "Command operations",
      startsAt: "2026-09-05T13:00:00.000Z",
      endsAt: "2026-09-05T17:00:00.000Z",
      creditedHours: "4",
    },
  ],
  attendance: Array.from({ length: 26 }, (_, index) => ({
    attendanceId: `attendance-${index}`,
    agencyName: "Example Fire",
    creditedHours: "4",
    firstName: `Student${index}`,
    lastName: "Roster",
    guestFirstName: null,
    guestLastName: null,
    fireEligible: true,
  })),
  fieldSnapshots: [],
  credentialSnapshots: [],
};

/** A revision read with an optional Fire-attestation left join. */
function revisionQueryFor(rows: unknown[]) {
  const result = { where: () => ({ limit: async () => rows }) };
  return { from: () => ({ ...result, leftJoin: () => result }) };
}

/** A scope-attestation read for the revision. */
function attestationQueryFor(rows: unknown[]) {
  return { from: () => ({ where: async () => rows }) };
}

/**
 * Reads a field's rendered appearance before flattening and reports the
 * auto-sized font size and how many text runs (lines) it drew. pdf-lib lays a
 * wrapped value out as one text run per line.
 */
function renderedTextRuns(
  page: PDFDocument,
  fieldName: string,
): { fontSize: number; lineCount: number } {
  const widget = page
    .getForm()
    .getTextField(fieldName)
    .acroField.getWidgets()[0];
  const normal = widget?.getAppearances()?.normal;
  if (!(normal instanceof PDFContentStream)) {
    throw new Error(`No appearance stream for ${fieldName}`);
  }
  const content = normal.getContentsString();
  const fontSize = Number(
    /\/[A-Za-z0-9]+\s+([\d.]+)\s+Tf/.exec(content)?.[1] ?? "0",
  );
  const lineCount = content.match(/\bTj\b/g)?.length ?? 0;
  return { fontSize, lineCount };
}

/** Decoded content streams for one page. */
function pageContent(page: PDFPage): string {
  const contents = page.node.Contents();
  if (!contents) return "";
  const context = page.doc.context;
  const streams =
    contents instanceof PDFArray
      ? Array.from({ length: contents.size() }, (_, index) =>
          context.lookup(contents.get(index)),
        )
      : [context.lookup(contents)];
  return streams
    .map((stream) => {
      if (stream instanceof PDFRawStream) {
        return Buffer.from(decodePDFRawStream(stream).decode()).toString(
          "latin1",
        );
      }
      return stream instanceof PDFContentStream
        ? stream.getContentsString()
        : "";
    })
    .join("\n");
}

/** How many text draws use the embedded Allura signature face. */
function alluraTextRuns(page: PDFPage): number {
  const fontResources = page.node
    .Resources()
    ?.lookup(PDFName.of("Font"), PDFDict);
  if (!(fontResources instanceof PDFDict)) return 0;
  const resourceNames = fontResources
    .keys()
    .map((key) => key.toString().replace(/^\//, ""))
    .filter((name) => name.includes("Allura"));
  if (!resourceNames.length) return 0;
  const content = pageContent(page);
  return resourceNames.reduce(
    (count, name) =>
      count +
      [...content.matchAll(new RegExp(`/${name}\\s+[\\d.]+\\s+Tf`, "g"))]
        .length,
    0,
  );
}

describe("official roster PDF templates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses supplied approved templates and mapped AcroForm fields", async () => {
    for (const mapping of Object.values(TEMPLATE_MAPPINGS)) {
      const bytes = await readFile(
        new URL(`./${mapping.assetName}`, import.meta.url),
      );
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        mapping.sourceChecksum,
      );
      const fields = new Set(
        (await PDFDocument.load(bytes))
          .getForm()
          .getFields()
          .map((field) => field.getName()),
      );
      for (const name of Object.values(mapping.fields))
        expect(fields.has(name)).toBe(true);
    }
  });

  it("uses the supplied KBEMS-E16 template and mapped fields", async () => {
    const bytes = await readFile(
      new URL(`./${KBEMS_E16_TEMPLATE.assetName}`, import.meta.url),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      KBEMS_E16_TEMPLATE.sourceChecksum,
    );
    const fields = new Set(
      (await PDFDocument.load(bytes))
        .getForm()
        .getFields()
        .map((field) => field.getName()),
    );
    for (const name of Object.values(KBEMS_E16_TEMPLATE.fields)) {
      expect(fields.has(name)).toBe(true);
    }
    expect(KBEMS_E16_TEMPLATE.pageCapacity).toBe(16);
  });

  it("aggregates the E16 one-day schedule and objectives", async () => {
    const aggregate: FinalizationSnapshot = {
      ...snapshot,
      class: {
        ...snapshot.class,
        courseName: "Airway Management",
        siteName: "Station 2",
        objectives: "Airway management",
      },
      components: [
        {
          title: "Forcible Entry",
          startsAt: "2026-09-05T15:00:00.000Z",
          endsAt: "2026-09-05T16:30:00.000Z",
          creditedHours: "1.5",
        },
        {
          title: "Trauma",
          startsAt: "2026-09-05T16:30:00.000Z",
          endsAt: "2026-09-05T17:00:00.000Z",
          creditedHours: "0.5",
        },
      ],
      attendance: snapshot.attendance.slice(0, 1),
    };

    const page = await renderKbemsE16Page(aggregate, aggregate.attendance, {
      flatten: false,
    });
    const form = page.getForm();
    expect(form.getTextField("Course Name").getText()).toBe(
      "Airway Management",
    );
    expect(form.getTextField("Instructor Name").getText()).toBe(
      "Lead Instructor, Assistant Instructor",
    );
    expect(form.getTextField("Location").getText()).toBe("Station 2");
    expect(form.getTextField("Date").getText()).toBe("09/05/2026");
    expect(form.getTextField("Start Time").getText()).toBe("11:00 AM");
    expect(form.getTextField("End Time").getText()).toBe("1:00 PM");
    expect(form.getTextField("Total Hours").getText()).toBe("2");
    expect(
      form.getTextField("Course Description or Objectives").getText(),
    ).toBe("Airway management");
  });

  it("prints every E16 attendee and leaves a missing KEMSIS ID blank", async () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    const withIdentifiers: FinalizationSnapshot = {
      ...snapshot,
      attendance: snapshot.attendance.slice(0, 2),
      credentialSnapshots: [
        {
          attendanceId: "attendance-0",
          credentialTypeCode: "kemsis",
          encryptedValue: encryptCredential("KEMSIS-456"),
        },
      ],
    };

    const page = await renderKbemsE16Page(
      withIdentifiers,
      withIdentifiers.attendance,
      { flatten: false },
    );
    const form = page.getForm();
    expect(form.getTextField("Student Name PrintRow1").getText()).toBe(
      "Student0 Roster",
    );
    expect(form.getTextField("KEMSIS IDRow1").getText()).toBe("KEMSIS-456");
    expect(form.getTextField("Affiliated ServiceRow1").getText()).toBe(
      "Example Fire",
    );
    expect(form.getTextField("Student Name PrintRow2").getText()).toBe(
      "Student1 Roster",
    );
    expect(form.getTextField("KEMSIS IDRow2").getText() ?? "").toBe("");
  });

  it("paginates the E16", async () => {
    const attendee = snapshot.attendance[0];
    if (!attendee) throw new Error("fixture attendee is missing");
    const many: FinalizationSnapshot = {
      ...snapshot,
      attendance: Array.from({ length: 17 }, (_, index) => ({
        ...attendee,
        attendanceId: `e16-attendance-${index}`,
        firstName: `E16 Student ${index}`,
      })),
    };

    const pdf = await PDFDocument.load(await renderKbemsE16Roster(many));
    expect(pdf.getPageCount()).toBe(2);

    const page = await renderKbemsE16Page(many, many.attendance.slice(16), {
      flatten: false,
      page: 2,
      pageCount: 2,
    });
    const form = page.getForm();
    expect(
      form
        .getTextField(
          "Please mark out blank lines at the conclusion of the course",
        )
        .getText(),
    ).toBe("2");
    expect(form.getTextField("of").getText()).toBe("2");
  });

  it("prints instructor and confirmed attendee signatures", async () => {
    const [attested, unattested] = snapshot.attendance;
    if (!attested || !unattested) {
      throw new Error("fixture attendees are missing");
    }
    const signed: FinalizationSnapshot = {
      ...snapshot,
      signature: {
        name: "Xavier Quinn",
        signedAt: "2026-09-05T18:00:00.000Z",
        attestationVersion: "roster-attestation-001",
      },
      attendance: [
        {
          ...attested,
          attendanceId: "attested-attendance",
          attestedAt: "2026-09-05T17:00:00.000Z",
        },
        {
          ...unattested,
          attendanceId: "unattested-attendance",
          attestedAt: null,
        },
      ],
    };

    expect(kbemsE16Signatures(signed, signed.attendance)).toEqual([
      { kind: "instructor", row: 0, text: "Xavier Quinn" },
      { kind: "attendee", row: 1, text: "Student0 Roster" },
    ]);

    const page = await renderKbemsE16Page(signed, signed.attendance, {
      flatten: false,
    });
    expect(alluraTextRuns(page.getPage(0))).toBe(2);
  });

  it("prints attendee signatures from an older snapshot sign-in record", async () => {
    const [attested, unattested] = snapshot.attendance;
    if (!attested || !unattested) {
      throw new Error("fixture attendees are missing");
    }
    const older: FinalizationSnapshot = {
      ...snapshot,
      attendance: [
        { ...attested, attendanceId: "older-attested", attestedAt: undefined },
        {
          ...unattested,
          attendanceId: "older-unattested",
          attestedAt: undefined,
        },
      ],
      signInRecord: {
        active: [
          {
            attendanceId: "older-attested",
            attestation: { confirmedAt: "2026-09-05T17:00:00.000Z" },
          },
          { attendanceId: "older-unattested", attestation: null },
        ],
      },
    };

    expect(kbemsE16Signatures(older, older.attendance)).toEqual([
      { kind: "attendee", row: 1, text: "Student0 Roster" },
    ]);

    const page = await renderKbemsE16Page(older, older.attendance, {
      flatten: false,
    });
    expect(alluraTextRuns(page.getPage(0))).toBe(1);
  });

  it("leaves unattested and legacy E16 signature lines blank", async () => {
    const legacy: FinalizationSnapshot = {
      ...snapshot,
      attendance: snapshot.attendance.slice(0, 2).map((attendee) => ({
        ...attendee,
        attestedAt: null,
      })),
    };
    expect(kbemsE16Signatures(legacy, legacy.attendance)).toEqual([]);

    const page = await renderKbemsE16Page(legacy, legacy.attendance, {
      flatten: false,
    });
    expect(alluraTextRuns(page.getPage(0))).toBe(0);
  });

  it("keeps attendee signatures aligned on each E16 page", async () => {
    const attendee = snapshot.attendance[0];
    if (!attendee) throw new Error("fixture attendee is missing");
    const many: FinalizationSnapshot = {
      ...snapshot,
      attendance: Array.from({ length: 17 }, (_, index) => ({
        ...attendee,
        attendanceId: `signed-attendance-${index}`,
        firstName: `Signed Student ${index}`,
        attestedAt: "2026-09-05T17:00:00.000Z",
      })),
    };
    const pageTwoAttendees = many.attendance.slice(16);
    expect(kbemsE16Signatures(many, pageTwoAttendees)).toEqual([
      { kind: "attendee", row: 1, text: "Signed Student 16 Roster" },
    ]);

    const page = await renderKbemsE16Page(many, pageTwoAttendees, {
      flatten: false,
      page: 2,
      pageCount: 2,
    });
    expect(alluraTextRuns(page.getPage(0))).toBe(1);
  });

  it("wraps long KFS-1A subject values across two lines at a larger size", async () => {
    const longCurriculumLabel =
      "IFSTA Essentials of Firefighting 8th Edition - Chapter 3. Communications";
    const long: FinalizationSnapshot = {
      ...snapshot,
      components: [
        {
          title: "Command operations",
          className: "Incident Command and Multi-Agency Coordination",
          curriculumPublisher: "IFSTA",
          curriculumProgramTitle: "Essentials of Firefighting",
          curriculumVersion: "8th Edition",
          curriculumChapter: "Chapter 3. Communications",
          lessonPlan: "Command operations and multi-agency coordination plan",
          startsAt: "2026-09-05T13:00:00.000Z",
          endsAt: "2026-09-05T17:00:00.000Z",
          creditedHours: "4",
        },
      ],
    };
    const page = await renderRosterPage(
      "kfs-1a",
      long,
      long.attendance.slice(0, 1),
      { flatten: false },
    );

    for (const field of [
      "CurriculumRow1",
      "Class NameRow1",
      "Lesson PlanRow1",
    ]) {
      expect(renderedTextRuns(page, field).lineCount).toBe(2);
    }

    // Without wrapping, the same value in the same cell shrinks onto one line.
    const mapping = getTemplateMapping("kfs-1a");
    const unwrapped = await renderPage(
      { ...mapping, wrapFields: undefined },
      (pdf) => {
        pdf
          .getForm()
          .getTextField("CurriculumRow1")
          .setText(longCurriculumLabel);
      },
      { flatten: false },
    );
    const unwrappedCurriculum = renderedTextRuns(unwrapped, "CurriculumRow1");
    expect(unwrappedCurriculum.lineCount).toBe(1);
    expect(renderedTextRuns(page, "CurriculumRow1").fontSize).toBeGreaterThan(
      unwrappedCurriculum.fontSize,
    );
  });

  it("keeps a short KFS-1A subject value on one line", async () => {
    const short: FinalizationSnapshot = {
      ...snapshot,
      components: [
        {
          title: "Command operations",
          curriculumChapter: "Ch 3",
          startsAt: "2026-09-05T13:00:00.000Z",
          endsAt: "2026-09-05T17:00:00.000Z",
          creditedHours: "4",
        },
      ],
    };
    const page = await renderRosterPage(
      "kfs-1a",
      short,
      short.attendance.slice(0, 1),
      { flatten: false },
    );
    expect(renderedTextRuns(page, "CurriculumRow1").lineCount).toBe(1);
  });

  it("prints the chapter title in the KFS-1A lesson plan cell", async () => {
    const component = snapshot.components?.[0];
    if (!component) throw new Error("fixture component is missing");
    const withChapter: FinalizationSnapshot = {
      ...snapshot,
      components: [
        {
          ...component,
          curriculumChapter: "Firefighter I: Chapter 3. Communications",
          lessonPlan: "Communications",
        },
      ],
    };
    const page = await renderRosterPage(
      "kfs-1a",
      withChapter,
      withChapter.attendance.slice(0, 1),
      { flatten: false },
    );
    expect(page.getForm().getTextField("Lesson PlanRow1").getText()).toBe(
      "Communications",
    );
  });

  it("paginates every attendee and flattens the form", async () => {
    const kfs = await renderOfficialRoster("kfs-1a", snapshot);
    expect((await PDFDocument.load(kfs)).getPageCount()).toBe(2);
    expect((await PDFDocument.load(kfs)).getForm().getFields()).toHaveLength(0);
  });

  it("renders the same finalized inputs deterministically", async () => {
    await expect(renderOfficialRoster("kfs-1a", snapshot)).resolves.toEqual(
      await renderOfficialRoster("kfs-1a", snapshot),
    );
  });

  it("keeps the official roster's template backgrounds and alignment", async () => {
    const page = await renderRosterPage(
      "kfs-1a",
      snapshot,
      snapshot.attendance.slice(0, 1),
      { flatten: false },
    );
    const form = page.getForm();
    const checkbox = form.getCheckBox("Check Box2").acroField.getWidgets()[0];
    expect(
      checkbox?.getAppearanceCharacteristics()?.dict.lookup(PDFName.of("BG")),
    ).toBeDefined();
    const source = await PDFDocument.load(
      await readFile(new URL("./kfs-1a-october-2023.pdf", import.meta.url)),
    );
    expect(form.getTextField("LAST NAMERow1").getAlignment()).toBe(
      source.getForm().getTextField("LAST NAMERow1").getAlignment(),
    );
  });

  it("renders official rosters in the standard Helvetica face", async () => {
    const page = await renderRosterPage(
      "kfs-1a",
      snapshot,
      snapshot.attendance.slice(0, 1),
      { flatten: false },
    );
    const widget = page
      .getForm()
      .getTextField("LAST NAMERow1")
      .acroField.getWidgets()[0];
    const normal = widget?.getAppearances()?.normal;
    if (!(normal instanceof PDFContentStream)) {
      throw new Error("no appearance stream for LAST NAMERow1");
    }
    expect(normal.getContentsString()).toContain("Helvetica");
  });

  it("omits attendees without a valid FFN from the KFS-1A", async () => {
    const eligible = snapshot.attendance.map((attendee, index) => ({
      ...attendee,
      attendanceId: `eligible-${index}`,
    }));
    const ineligible = snapshot.attendance.map((attendee, index) => ({
      ...attendee,
      attendanceId: `ineligible-${index}`,
      fireEligible: false,
    }));
    const mixed = await renderOfficialRoster("kfs-1a", {
      ...snapshot,
      attendance: [...eligible, ...ineligible],
    });
    // 26 eligible at 25 per page is two pages; the 26 ineligible add no pages.
    expect((await PDFDocument.load(mixed)).getPageCount()).toBe(2);

    const none = await renderOfficialRoster("kfs-1a", {
      ...snapshot,
      attendance: ineligible,
    });
    expect((await PDFDocument.load(none)).getPageCount()).toBe(1);
  });

  const zoeZeta = {
    attendanceId: "attendance-unique",
    agencyName: "Example Fire",
    creditedHours: "4",
    firstName: "Zoe",
    lastName: "Zeta",
    guestFirstName: null,
    guestLastName: null,
    fireEligible: true,
  };

  it("populates the KFS-1A signature and initials from revision facts", async () => {
    const signed: FinalizationSnapshot = {
      ...snapshot,
      signature: {
        name: "Xavier Quinn",
        signedAt: "2026-09-05T18:00:00.000Z",
        attestationVersion: "roster-attestation-001",
      },
      attendance: [zoeZeta],
    };
    const page = await renderRosterPage("kfs-1a", signed, signed.attendance, {
      flatten: false,
    });
    const form = page.getForm();
    expect(form.getTextField("Text1").getText()).toBe("Xavier Quinn");
    expect(form.getTextField("Instructor Initials").getText()).toBe("XQ");
    expect(form.getTextField("INITIALSRow1").getText()).toBe("ZZ");
  });

  it("leaves the KFS-1A signature blank without signing facts but still prints initials", async () => {
    const unsigned: FinalizationSnapshot = {
      ...snapshot,
      attendance: [zoeZeta],
    };
    const page = await renderRosterPage(
      "kfs-1a",
      unsigned,
      unsigned.attendance,
      {
        flatten: false,
      },
    );
    const form = page.getForm();
    expect(form.getTextField("Text1").getText() ?? "").toBe("");
    expect(form.getTextField("Instructor Initials").getText() ?? "").toBe("");
    expect(form.getTextField("INITIALSRow1").getText()).toBe("ZZ");
  });

  it("provides the signature, instructor-initials, and attendee-initials fields", async () => {
    const bytes = await readFile(
      new URL("./kfs-1a-october-2023.pdf", import.meta.url),
    );
    const fields = new Set(
      (await PDFDocument.load(bytes))
        .getForm()
        .getFields()
        .map((field) => field.getName()),
    );
    expect(fields.has("Text1")).toBe(true);
    expect(fields.has("Instructor Initials")).toBe(true);
    for (let row = 1; row <= 25; row += 1) {
      expect(fields.has(`INITIALSRow${row}`)).toBe(true);
    }
  });

  it("uses the course name when a session title is omitted", async () => {
    const titledWithCourseName: FinalizationSnapshot = {
      ...snapshot,
      components: [
        {
          title: "Incident Command",
          startsAt: "2026-09-05T13:00:00.000Z",
          endsAt: "2026-09-05T17:00:00.000Z",
          creditedHours: "4",
        },
      ],
    };
    const untitled: FinalizationSnapshot = {
      ...snapshot,
      components: [
        {
          title: null,
          startsAt: "2026-09-05T13:00:00.000Z",
          endsAt: "2026-09-05T17:00:00.000Z",
          creditedHours: "4",
        },
      ],
    };

    await expect(renderOfficialRoster("kfs-1a", untitled)).resolves.toEqual(
      await renderOfficialRoster("kfs-1a", titledWithCourseName),
    );
  });

  it("limits authority to Training Majors and Administrators", () => {
    expect(hasOfficialRosterAuthority(["training-major"])).toBe(true);
    expect(hasOfficialRosterAuthority(["administrator"])).toBe(true);
    expect(hasOfficialRosterAuthority(["instructor"])).toBe(false);
  });

  it("selects the Fire identifier for the official form", () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    const identifiers: FinalizationSnapshot = {
      ...snapshot,
      attendance: snapshot.attendance,
      credentialSnapshots: [
        {
          attendanceId: "attendance-0",
          credentialTypeCode: "ffn",
          encryptedValue: encryptCredential("FFN-123"),
        },
        {
          attendanceId: "attendance-0",
          credentialTypeCode: "kemsis",
          encryptedValue: encryptCredential("KEMSIS-456"),
        },
      ],
    };

    expect(snapshotIdentifier(identifiers, "attendance-0")).toBe("FFN-123");
    expect(snapshotIdentifier(identifiers, "attendance-0", "kbems-e16")).toBe(
      "KEMSIS-456",
    );
  });

  it("renders a direct download without database metadata writes", async () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    const authorityQuery = {
      from: () => ({
        innerJoin: () => ({
          where: () => ({ limit: async () => [{ code: "training-major" }] }),
        }),
      }),
    };
    const revisionQuery = revisionQueryFor([
      { encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)) },
    ]);
    const select = vi
      .fn()
      .mockReturnValueOnce(revisionQuery)
      .mockReturnValueOnce(authorityQuery)
      .mockReturnValueOnce(attestationQueryFor([]));
    const db = { select } as unknown as Database;

    const roster = await generateOfficialRoster(
      db,
      { id: "staff-id", username: "major" },
      "revision-id",
      "kfs-1a",
    );

    expect(select).toHaveBeenCalledTimes(3);
    expect(roster.bytes).toBeInstanceOf(Uint8Array);
    expect(roster.filename).toBe("kfs-1a-kfs-1a-october-2023.pdf");
  });

  it("permits an instructor assigned to the revision class", async () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    const revisionQuery = revisionQueryFor([
      {
        classId: "class-id",
        encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)),
      },
    ]);
    const authorityQuery = {
      from: () => ({
        innerJoin: () => ({ where: () => ({ limit: async () => [] }) }),
      }),
    };
    const assignedQuery = {
      from: () => ({
        where: () => ({ limit: async () => [{ classId: "class-id" }] }),
      }),
    };
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(revisionQuery)
        .mockReturnValueOnce(authorityQuery)
        .mockReturnValueOnce(assignedQuery)
        .mockReturnValueOnce(attestationQueryFor([])),
    } as unknown as Database;

    await expect(
      generateOfficialRoster(
        db,
        { id: "instructor-id", username: "instructor" },
        "revision-id",
        "kfs-1a",
      ),
    ).resolves.toMatchObject({ filename: expect.stringMatching(/^kfs-1a-/) });
  });

  it("reports an unreadable revision snapshot as a controlled error", async () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    const revisionQuery = revisionQueryFor([
      // A fixture revision stores a payload that is not valid AES-GCM.
      { classId: "class-id", encryptedSnapshot: "fixture" },
    ]);
    const authorityQuery = {
      from: () => ({
        innerJoin: () => ({
          where: () => ({ limit: async () => [{ code: "administrator" }] }),
        }),
      }),
    };
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(revisionQuery)
        .mockReturnValueOnce(authorityQuery)
        .mockReturnValueOnce(attestationQueryFor([])),
    } as unknown as Database;

    await expect(
      generateOfficialRoster(
        db,
        { id: "staff-id", username: "major" },
        "revision-id",
        "kfs-1a",
      ),
    ).rejects.toBeInstanceOf(UnreadableRevisionSnapshotError);
  });

  it("validates recipients and audits a successful Resend delivery", async () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const auditValues = vi.fn().mockResolvedValue(undefined);
    const transaction = vi.fn(async (callback) =>
      callback({ insert: () => ({ values: auditValues }) }),
    );
    const revisionQuery = revisionQueryFor([
      {
        classId: "class-id",
        encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)),
      },
    ]);
    const authorityQuery = {
      from: () => ({
        innerJoin: () => ({
          where: () => ({ limit: async () => [{ code: "training-major" }] }),
        }),
      }),
    };
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(revisionQuery)
        .mockReturnValueOnce(authorityQuery)
        .mockReturnValueOnce(attestationQueryFor([])),
      transaction,
    } as unknown as Database;

    expect(() => validateOfficialRosterRecipient("invalid")).toThrow();
    await emailOfficialRoster(
      db,
      { id: "staff-id", username: "major" },
      "revision-id",
      "kfs-1a",
      "recipient@example.com",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("Expected a fetch call.");
    const body = JSON.parse((call[1] as RequestInit).body as string);
    const pdf = body.attachments.find((attachment: { filename: string }) =>
      attachment.filename.endsWith(".pdf"),
    );
    expect(pdf).toMatchObject({ content_type: "application/pdf" });
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "official_roster.email.sent",
        entityId: "revision-id",
        details: expect.objectContaining({
          recipient: "recipient@example.com",
        }),
      }),
    );
  });

  it("does not audit a failed Resend delivery", async () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const transaction = vi.fn();
    const revisionQuery = revisionQueryFor([
      {
        classId: "class-id",
        encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)),
      },
    ]);
    const authorityQuery = {
      from: () => ({
        innerJoin: () => ({
          where: () => ({ limit: async () => [{ code: "training-major" }] }),
        }),
      }),
    };
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(revisionQuery)
        .mockReturnValueOnce(authorityQuery)
        .mockReturnValueOnce(attestationQueryFor([])),
      transaction,
    } as unknown as Database;

    await expect(
      emailOfficialRoster(
        db,
        { id: "staff-id", username: "major" },
        "revision-id",
        "kfs-1a",
        "recipient@example.com",
      ),
    ).rejects.toThrow("Official roster email could not be sent.");
    expect(transaction).not.toHaveBeenCalled();
  });
});
