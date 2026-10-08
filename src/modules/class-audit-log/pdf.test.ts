import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { auditCategory, describeAuditEntry } from "./labels";
import { renderClassAuditLogPdf } from "./pdf";
import type { ClassAuditLog, ClassAuditLogEntry } from "./service";

function entry(overrides: Partial<ClassAuditLogEntry>): ClassAuditLogEntry {
  return {
    id: crypto.randomUUID(),
    occurredAt: new Date("2026-09-10T13:00:00Z"),
    actorType: "user",
    actorName: "Record Instructor",
    action: "class.updated",
    entityType: "class",
    entityId: crypto.randomUUID(),
    ipAddress: null,
    details: {},
    revisionNumber: null,
    ...overrides,
  };
}

function auditLog(entries: ClassAuditLogEntry[]): ClassAuditLog {
  return {
    classId: crypto.randomUUID(),
    className: "Record Course",
    siteName: "Record Site",
    status: "finalized",
    generatedAt: new Date("2026-09-11T09:00:00Z"),
    entries,
  };
}

describe("audit action labels", () => {
  it("describes a known action in human terms", () => {
    expect(
      describeAuditEntry(
        entry({
          action: "class.status.changed",
          details: { from: "open", to: "finalized" },
        }),
      ),
    ).toBe("Status changed from open to finalized");
    expect(
      describeAuditEntry(
        entry({
          action: "official_roster.email.sent",
          details: { formType: "kfs-1a", recipient: "fire@example.com" },
        }),
      ),
    ).toBe("KFS-1A roster emailed to fire@example.com");
    expect(auditCategory("class.finalized")).toBe("finalization");
  });

  it("falls back to a humanized action for unknown events", () => {
    expect(
      describeAuditEntry(entry({ action: "mystery.event_happened" })),
    ).toBe("mystery event happened");
    expect(auditCategory("mystery.event_happened")).toBe("other");
  });
});

describe("class audit log pdf", () => {
  it("renders the same entries deterministically", async () => {
    const log = auditLog([
      entry({ action: "class.created", details: { name: "Record Course" } }),
      entry({ action: "attendance.public_sign_in" }),
    ]);
    await expect(renderClassAuditLogPdf(log)).resolves.toEqual(
      await renderClassAuditLogPdf(log),
    );
  });

  it("paginates a long audit trail across pages", async () => {
    const entries = Array.from({ length: 200 }, (_, index) =>
      entry({
        action: "attendance.public_sign_in",
        occurredAt: new Date(2026, 8, 10, 8, index),
      }),
    );
    const bytes = await renderClassAuditLogPdf(auditLog(entries));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });

  it("renders an empty trail with a single page", async () => {
    const bytes = await renderClassAuditLogPdf(auditLog([]));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
