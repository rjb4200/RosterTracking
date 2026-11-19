import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  appendInstructorSupplement,
  type FinalizationSnapshot,
} from "./service";

function snapshot(instructors: FinalizationSnapshot["instructors"]) {
  return {
    class: {
      courseName: "Team Class",
      siteName: "Station 1",
      hostAgencyName: "Winchester Fire",
      completedAt: "2026-09-10T12:00:00.000Z",
    },
    instructors,
    attendance: [],
    fieldSnapshots: [],
    credentialSnapshots: [],
  } as FinalizationSnapshot;
}

describe("instructor roster supplement", () => {
  it("does not add a page for the two official instructors", async () => {
    const pdf = await PDFDocument.create();
    await appendInstructorSupplement(
      pdf,
      snapshot([
        { userId: "lead", name: "Lead", isLead: true, isAssistant: false },
        {
          userId: "assistant",
          name: "Assistant",
          isLead: false,
          isAssistant: true,
        },
      ]),
    );
    expect(pdf.getPageCount()).toBe(0);
  });

  it("lists the full team without rendering signatures", async () => {
    const pdf = await PDFDocument.create();
    await appendInstructorSupplement(
      pdf,
      snapshot([
        {
          userId: "lead",
          name: "Lead",
          isLead: true,
          isAssistant: false,
          ffn: "1234-5678",
          level: 2,
        },
        {
          userId: "assistant",
          name: "Assistant",
          isLead: false,
          isAssistant: true,
        },
        {
          userId: "additional",
          name: "Additional",
          isLead: false,
          isAssistant: false,
        },
      ]),
    );
    expect(pdf.getPageCount()).toBe(1);
    const page = pdf.getPages()[0];
    expect(page).toBeDefined();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    expect(font.widthOfTextAtSize("Additional", 10)).toBeGreaterThan(0);
  });
});
