import { describe, expect, it } from "vitest";

import {
  instructorLabel,
  renderCertificateEmail,
  renderClassReminderEmail,
  renderCompletionNoticeEmail,
} from "./templates";

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

  it("marks an hours record distinctly", () => {
    const message = renderCertificateEmail({ ...input, hoursRecord: true });
    expect(message.subject).toContain("Hours Record");
    expect(message.html).toContain("Hours Record");
    expect(message.html).toContain("It is not the official certification");
    expect(message.html).toContain("Your hours record is attached");
    expect(message.text).toContain("HOURS RECORD");
  });
});

describe("completion notice email template", () => {
  const input = {
    participantName: "Ada Lovelace",
    courseName: "Advanced Cardiac Life Support",
    completedAt: "09/05/2026",
    classHours: "8",
    agencyName: "Winchester EMS",
    officialIssuer: "AHA",
  };

  it("states the class is complete and names the official issuer", () => {
    const message = renderCompletionNoticeEmail(input);
    expect(message.subject).toContain("Course Completed");
    expect(message.html).toContain("Ada Lovelace");
    expect(message.html).toContain(
      "You have completed Advanced Cardiac Life Support",
    );
    expect(message.html).toContain("AHA certification will be sent separately");
    expect(message.html).toContain("<!doctype html>");
    expect(message.html).toContain('src="cid:wfd-logo"');
    expect(message.text).toContain("COURSE COMPLETED");
  });

  it("escapes HTML in participant and course values", () => {
    const message = renderCompletionNoticeEmail({
      ...input,
      participantName: 'Ada "Ace" <script>',
      courseName: "Airway & Oxygen",
    });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("Airway &amp; Oxygen");
  });

  it("does not attach a certificate", () => {
    const message = renderCompletionNoticeEmail(input);
    expect(message.html).not.toContain("certificate is attached");
    expect(message.text).not.toContain("certificate is attached");
  });
});

describe("class reminder email template", () => {
  it("lists each overdue class with a review link", () => {
    const message = renderClassReminderEmail({
      instructorName: "Lead Medic",
      classes: [
        {
          name: "Airway Management",
          date: "Sep 5, 2026, 2:00 PM",
          url: "https://example.test/staff/classes/c1/review",
        },
        {
          name: "Incident Command",
          date: "Sep 6, 2026, 9:00 AM",
          url: "https://example.test/staff/classes/c2/review",
        },
      ],
    });
    expect(message.subject).toBe("2 rosters await finalization");
    expect(message.html).toContain("Lead Medic");
    expect(message.html).toContain("Airway Management");
    expect(message.html).toContain("Incident Command");
    expect(message.html).toContain(
      "https://example.test/staff/classes/c1/review",
    );
    expect(message.html).toContain("<!doctype html>");
    expect(message.html).toContain('src="cid:wfd-logo"');
    expect(message.text).toContain("Airway Management");
  });

  it("uses a singular subject for one class", () => {
    const message = renderClassReminderEmail({
      instructorName: "Lead Medic",
      classes: [
        { name: "Airway", date: "Sep 5, 2026", url: "https://x.test/r" },
      ],
    });
    expect(message.subject).toBe("1 roster awaits finalization");
  });

  it("escapes HTML in class names", () => {
    const message = renderClassReminderEmail({
      instructorName: "Lead & Co",
      classes: [{ name: "<script>", date: "Sep 5", url: "https://x.test/r" }],
    });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("Lead &amp; Co");
  });
});
