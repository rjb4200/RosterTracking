import { describe, expect, it } from "vitest";

import { instructorLabel, renderCertificateEmail } from "./templates";

describe("certificate email template", () => {
  const input = {
    participantName: "Ada Lovelace",
    courseName: "Airway Management",
    completedAt: "09/05/2026",
    classHours: "2",
    instructors: [
      { name: "Lead Medic", isLead: true },
      { name: "Alex Rivera", isLead: false },
    ],
    agencyName: "Winchester EMS",
  };

  it("renders a formal, branded body inside the shared shell", () => {
    const message = renderCertificateEmail(input);
    expect(message.subject).toContain("Airway Management");
    expect(message.html).toContain("Ada Lovelace");
    expect(message.html).toContain("Airway Management");
    expect(message.html).toContain("09/05/2026");
    expect(message.html).toContain("<!doctype html>");
    // Shared brand shell: red masthead, wordmark, inline logo, green rule, footer.
    expect(message.html).toContain("#A40104");
    expect(message.html).toContain("#6A994E");
    expect(message.html).toContain("Winchester Fire Department");
    expect(message.html).toContain('src="cid:wfd-logo"');
    expect(message.html).toContain("44 N Maple Street");
    expect(message.html).toContain("This certifies that the named participant");
  });

  it("presents the lead and assisting instructors and the agency", () => {
    const message = renderCertificateEmail(input);
    expect(message.html).toContain("Lead Medic (Lead)");
    expect(message.html).toContain("Alex Rivera (Assisting)");
    expect(message.html).toContain("Winchester EMS");
    expect(message.text).toContain("Lead Medic (Lead)");
    expect(message.text).toContain("Agency: Winchester EMS");
  });

  it("orders the lead instructor before assisting instructors", () => {
    expect(
      instructorLabel([
        { name: "Alex Rivera", isLead: false },
        { name: "Lead Medic", isLead: true },
      ]),
    ).toBe("Lead Medic (Lead)<br />Alex Rivera (Assisting)");
  });

  it("escapes HTML in participant, course, instructor, and agency values", () => {
    const message = renderCertificateEmail({
      ...input,
      participantName: 'Ada "Ace" <script>',
      courseName: "Airway & Oxygen",
      instructors: [{ name: "Bold Lead", isLead: true }],
      agencyName: "Agency & Co",
    });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("Airway &amp; Oxygen");
    expect(message.html).toContain("Agency &amp; Co");
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
