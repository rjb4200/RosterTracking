import { describe, expect, it } from "vitest";

import { collapseRepeatedGeneration } from "./collapse";

function generation(overrides: {
  action: string;
  entityId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  details?: unknown;
}) {
  return {
    action: overrides.action,
    entityId: overrides.entityId ?? "revision-1",
    actorUserId: overrides.actorUserId ?? "user-a",
    actorName: overrides.actorName ?? "Actor A",
    details: overrides.details ?? {},
  };
}

describe("collapseRepeatedGeneration", () => {
  it("collapses the same roster form generated repeatedly by one actor", () => {
    const rows = [
      generation({
        action: "official_roster.generated",
        details: { formType: "kfs-1a" },
      }),
      generation({
        action: "official_roster.generated",
        details: { formType: "kfs-1a" },
      }),
      generation({
        action: "official_roster.generated",
        details: { formType: "kfs-1a" },
      }),
    ];
    expect(collapseRepeatedGeneration(rows)).toHaveLength(1);
  });

  it("keeps each roster form and each actor separate", () => {
    const rows = [
      generation({
        action: "official_roster.generated",
        details: { formType: "kfs-1a" },
      }),
      generation({
        action: "official_roster.generated",
        details: { formType: "completion-certificate" },
      }),
      generation({
        action: "official_roster.generated",
        actorUserId: "user-b",
        actorName: "Actor B",
        details: { formType: "kfs-1a" },
      }),
    ];
    expect(collapseRepeatedGeneration(rows)).toHaveLength(3);
  });

  it("keeps the same form for different revisions separate", () => {
    const rows = [
      generation({
        action: "official_roster.generated",
        entityId: "revision-1",
        details: { formType: "kfs-1a" },
      }),
      generation({
        action: "official_roster.generated",
        entityId: "revision-2",
        details: { formType: "kfs-1a" },
      }),
    ];
    expect(collapseRepeatedGeneration(rows)).toHaveLength(2);
  });

  it("collapses repeated certificate generation by one actor and revision", () => {
    const rows = [
      generation({ action: "completion_certificate.generated" }),
      generation({ action: "completion_certificate.generated" }),
      generation({
        action: "completion_certificate.generated",
        entityId: "revision-2",
      }),
    ];
    expect(collapseRepeatedGeneration(rows)).toHaveLength(2);
  });

  it("keeps every email delivery because each send is distinct", () => {
    const rows = [
      generation({
        action: "official_roster.email.sent",
        details: { formType: "kfs-1a", recipient: "a@example.com" },
      }),
      generation({
        action: "official_roster.email.sent",
        details: { formType: "kfs-1a", recipient: "b@example.com" },
      }),
    ];
    expect(collapseRepeatedGeneration(rows)).toHaveLength(2);
  });

  it("keeps the earliest occurrence and preserves order", () => {
    const rows = [
      generation({ action: "class.created", details: {} }),
      generation({
        action: "official_roster.generated",
        details: { formType: "kfs-1a" },
      }),
      generation({
        action: "official_roster.generated",
        details: { formType: "kfs-1a" },
      }),
      generation({ action: "class.finalized", details: {} }),
    ];
    const collapsed = collapseRepeatedGeneration(rows);
    expect(collapsed.map((row) => row.action)).toEqual([
      "class.created",
      "official_roster.generated",
      "class.finalized",
    ]);
  });
});
