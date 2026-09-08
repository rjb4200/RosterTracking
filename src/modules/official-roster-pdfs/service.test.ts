import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";

import { encryptCredential } from "@/modules/reference/crypto";
import type { Database } from "@/server/db/client";

import { TEMPLATE_MAPPINGS } from "./mappings";
import {
  emailOfficialRoster,
  type FinalizationSnapshot,
  generateOfficialRoster,
  hasOfficialRosterAuthority,
  renderOfficialRoster,
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

  it("paginates every attendee and leaves no electronic signature values", async () => {
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

  it("limits authority to Training Majors and Administrators", () => {
    expect(hasOfficialRosterAuthority(["training-major"])).toBe(true);
    expect(hasOfficialRosterAuthority(["administrator"])).toBe(true);
    expect(hasOfficialRosterAuthority(["instructor"])).toBe(false);
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
