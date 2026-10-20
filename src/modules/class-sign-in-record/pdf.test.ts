import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFRawStream,
} from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  type ClassSignInRecord,
  type ClassSignInRecordEntry,
  renderClassSignInRecordPdf,
} from "./pdf";

function entry(
  index: number,
  withAttestation: boolean,
): ClassSignInRecordEntry {
  return {
    attendanceId: `attendance-${index}`,
    participantName: `Student${index} Record`,
    participantType: "regular",
    agencyName: "Example Fire Department",
    signInMethod: "qr",
    creditedHours: "8",
    signedInAt: new Date("2026-09-05T13:00:00.000Z"),
    attestation: withAttestation
      ? {
          renderedText:
            "I attest that the information I have provided is accurate and complete to the best of my knowledge and belief.",
          textVersion: 1,
          confirmedAt: new Date("2026-09-05T13:05:00.000Z"),
          originatingIp: "10.0.0.1",
          rememberedDeviceId: "device-abc",
        }
      : null,
  };
}

function record(count: number, withAttestation: boolean): ClassSignInRecord {
  return {
    classId: "class-1",
    courseName: "Hazardous Materials Operations",
    siteName: "Station 1",
    hostAgencyName: "Winchester Fire",
    deliveryMethod: "classroom",
    generatedAt: new Date("2026-09-05T14:00:00.000Z"),
    active: Array.from({ length: count }, (_, index) =>
      entry(index, withAttestation),
    ),
    removed: [],
  };
}

async function renderedTextY(bytes: Uint8Array): Promise<number[]> {
  const pdf = await PDFDocument.load(bytes);
  const ys: number[] = [];
  for (const page of pdf.getPages()) {
    const contents = page.node.Contents();
    if (!contents) continue;
    const streams =
      contents instanceof PDFArray
        ? Array.from({ length: contents.size() }, (_, index) =>
            contents.get(index),
          )
        : [contents];
    for (const reference of streams) {
      const stream = pdf.context.lookup(reference);
      const decoded =
        stream instanceof PDFRawStream
          ? decodePDFRawStream(stream).decode()
          : (stream as { getContents?: () => Uint8Array }).getContents?.();
      if (!decoded) continue;
      const text = Buffer.from(decoded).toString("latin1");
      for (const match of text.matchAll(/1 0 0 1 ([\d.]+) ([\d.-]+) Tm/g)) {
        ys.push(Number(match[2]));
      }
    }
  }
  return ys;
}

describe("class sign-in record pdf", () => {
  it("renders the same record deterministically", async () => {
    const sample = record(3, false);
    await expect(renderClassSignInRecordPdf(sample)).resolves.toEqual(
      await renderClassSignInRecordPdf(sample),
    );
  });

  it("renders an empty record with a single page", async () => {
    const bytes = await renderClassSignInRecordPdf(record(0, false));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("paginates a large class without drawing below the page", async () => {
    for (const withAttestation of [false, true]) {
      const bytes = await renderClassSignInRecordPdf(
        record(200, withAttestation),
      );
      expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
      const ys = await renderedTextY(bytes);
      expect(ys.length).toBeGreaterThan(0);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    }
  });
});
