import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StaffEmailBand } from "./staff-email-band";

describe("staff email prompt band", () => {
  const html = renderToStaticMarkup(
    createElement(StaffEmailBand, { loginMarker: "123456" }),
  );

  it("announces itself as a status region", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('class="staff-email-band"');
  });

  it("offers the add-email action linking to the profile", () => {
    expect(html).toContain('href="/staff/profile"');
    expect(html).toContain("Add email");
  });

  it("provides a labelled dismiss control", () => {
    expect(html).toContain('aria-label="Dismiss"');
    expect(html).toContain("staff-email-band-dismiss");
  });
});
