import { describe, expect, it } from "vitest";

import { renderCertificateEmail } from "./templates";

describe("certificate email template", () => {
  const input = {
    participantName: "Ada Lovelace",
    courseName: "Airway Management",
    completedAt: "09/05/2026",
    classHours: "2",
  };

  it("renders a branded subject, HTML, and text body", () => {
    const message = renderCertificateEmail(input);
    expect(message.subject).toContain("Airway Management");
    expect(message.html).toContain("Ada Lovelace");
    expect(message.html).toContain("Airway Management");
    expect(message.html).toContain("09/05/2026");
    expect(message.html).toContain("<!doctype html>");
    expect(message.text).toContain("Ada Lovelace");
  });

  it("escapes HTML in participant and course values", () => {
    const message = renderCertificateEmail({
      ...input,
      participantName: 'Ada "Ace" <script>',
      courseName: "Airway & Oxygen",
    });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("Airway &amp; Oxygen");
  });

  it("omits an absent completion date and hours", () => {
    const message = renderCertificateEmail({
      ...input,
      completedAt: null,
      classHours: "",
    });
    expect(message.text).not.toContain("Completion date:");
    expect(message.text).not.toContain("Class hours:");
  });
});
