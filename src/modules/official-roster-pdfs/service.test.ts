import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

import { encryptCredential } from "@/modules/reference/crypto";
import type { Database } from "@/server/db/client";

import { TEMPLATE_MAPPINGS } from "./mappings";
import {
  type FinalizationSnapshot,
  generateOfficialRoster,
  hasOfficialRosterAuthority,
  renderOfficialRoster,
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
      .mockReturnValueOnce(authorityQuery)
      .mockReturnValueOnce(revisionQuery);
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
});
