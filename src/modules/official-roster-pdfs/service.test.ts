import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { PDFContentStream, PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";

import { encryptCredential } from "@/modules/reference/crypto";
import type { Database } from "@/server/db/client";

import { getTemplateMapping, TEMPLATE_MAPPINGS } from "./mappings";
import {
  emailOfficialRoster,
  type FinalizationSnapshot,
  generateOfficialRoster,
  hasOfficialRosterAuthority,
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
    { name: "Lead Instructor", isLead: true },
    { name: "Assistant Instructor", isLead: false },
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
  })),
  fieldSnapshots: [],
  credentialSnapshots: [],
};

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

  it("paginates every attendee and flattens the form", async () => {
    const kfs = await renderOfficialRoster("kfs-1a", snapshot);
    const kbems = await renderOfficialRoster("kbems-e16", snapshot);
    expect((await PDFDocument.load(kfs)).getPageCount()).toBe(2);
    expect((await PDFDocument.load(kbems)).getPageCount()).toBe(2);
    expect((await PDFDocument.load(kfs)).getForm().getFields()).toHaveLength(0);
    expect((await PDFDocument.load(kbems)).getForm().getFields()).toHaveLength(
      0,
    );
  });

  it("renders the same finalized inputs deterministically", async () => {
    await expect(renderOfficialRoster("kfs-1a", snapshot)).resolves.toEqual(
      await renderOfficialRoster("kfs-1a", snapshot),
    );
  });

  const zoeZeta = {
    attendanceId: "attendance-unique",
    agencyName: "Example Fire",
    creditedHours: "4",
    firstName: "Zoe",
    lastName: "Zeta",
    guestFirstName: null,
    guestLastName: null,
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

  it("does not place an electronic signature on the KBEMS-E16", async () => {
    const signed: FinalizationSnapshot = {
      ...snapshot,
      signature: {
        name: "Xavier Quinn",
        signedAt: "2026-09-05T18:00:00.000Z",
        attestationVersion: "roster-attestation-001",
      },
      attendance: [zoeZeta],
    };
    const page = await renderRosterPage(
      "kbems-e16",
      signed,
      signed.attendance,
      {
        flatten: false,
      },
    );
    const names = page
      .getForm()
      .getFields()
      .map((field) => field.getName());
    // The KBEMS-E16 has no signature fields; those are physically signed.
    expect(names.some((name) => /signature/i.test(name))).toBe(false);
    // The signer's name never appears on the KBEMS-E16.
    expect(
      page.getForm().getTextField("Instructor Name").getText() ?? "",
    ).not.toContain("Xavier Quinn");
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
    await expect(renderOfficialRoster("kbems-e16", untitled)).resolves.toEqual(
      await renderOfficialRoster("kbems-e16", titledWithCourseName),
    );
  });

  it("renders a KBEMS roster when objectives and MTU usage are absent", async () => {
    // Older revisions predate both the KBEMS objectives field and MTU usage;
    // both must be optional so an existing revision still renders.
    const legacy: FinalizationSnapshot = {
      ...snapshot,
      class: { ...snapshot.class, objectives: null },
      mtuUsage: undefined,
    };
    const withObjectives: FinalizationSnapshot = {
      ...snapshot,
      class: { ...snapshot.class, objectives: "Airway management" },
    };

    await expect(
      renderOfficialRoster("kbems-e16", legacy),
    ).resolves.toBeInstanceOf(Uint8Array);
    await expect(
      renderOfficialRoster("kbems-e16", withObjectives),
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it("limits authority to Training Majors and Administrators", () => {
    expect(hasOfficialRosterAuthority(["training-major"])).toBe(true);
    expect(hasOfficialRosterAuthority(["administrator"])).toBe(true);
    expect(hasOfficialRosterAuthority(["instructor"])).toBe(false);
  });

  it("selects the identifier required by each official form", () => {
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

    expect(snapshotIdentifier(identifiers, "attendance-0", "kfs-1a")).toBe(
      "FFN-123",
    );
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
    const revisionQuery = {
      from: () => ({
        where: () => ({
          limit: async () => [
            { encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)) },
          ],
        }),
      }),
    };
    const select = vi
      .fn()
      .mockReturnValueOnce(revisionQuery)
      .mockReturnValueOnce(authorityQuery);
    const db = { select } as unknown as Database;

    const roster = await generateOfficialRoster(
      db,
      { id: "staff-id", username: "major" },
      "revision-id",
      "kfs-1a",
    );

    expect(select).toHaveBeenCalledTimes(2);
    expect(roster.bytes).toBeInstanceOf(Uint8Array);
    expect(roster.filename).toBe("kfs-1a-kfs-1a-october-2023.pdf");
  });

  it("permits an instructor assigned to the revision class", async () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    );
    const revisionQuery = {
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              classId: "class-id",
              encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)),
            },
          ],
        }),
      }),
    };
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
        .mockReturnValueOnce(assignedQuery),
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
    const revisionQuery = {
      from: () => ({
        where: () => ({
          // A fixture revision stores a payload that is not valid AES-GCM.
          limit: async () => [
            { classId: "class-id", encryptedSnapshot: "fixture" },
          ],
        }),
      }),
    };
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
        .mockReturnValueOnce(authorityQuery),
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const auditValues = vi.fn().mockResolvedValue(undefined);
    const transaction = vi.fn(async (callback) =>
      callback({ insert: () => ({ values: auditValues }) }),
    );
    const revisionQuery = {
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              classId: "class-id",
              encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)),
            },
          ],
        }),
      }),
    };
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
        .mockReturnValueOnce(authorityQuery),
      transaction,
    } as unknown as Database;

    expect(() => validateOfficialRosterRecipient("invalid")).toThrow();
    await emailOfficialRoster(
      db,
      { id: "staff-id", username: "major" },
      "revision-id",
      "kbems-e16",
      "recipient@example.com",
    );

    expect(fetch).toHaveBeenCalledOnce();
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
    const revisionQuery = {
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              classId: "class-id",
              encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)),
            },
          ],
        }),
      }),
    };
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
        .mockReturnValueOnce(authorityQuery),
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
