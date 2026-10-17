import { TriangleAlert } from "lucide-react";

import { StaffEmailDismissButton } from "./staff-email-dismiss-button";

/** Full-bleed prompt shown to a staff account that has no email yet. */
export function StaffEmailBand({ loginMarker }: { loginMarker: string }) {
  return (
    <section className="staff-email-band" role="status">
      <div className="staff-email-band-copy">
        <TriangleAlert aria-hidden="true" />
        <p>
          Add an email to your profile so you can sign in with it and receive
          class reminders.
        </p>
      </div>
      <a className="staff-email-band-cta" href="/staff/profile">
        Add email
      </a>
      <StaffEmailDismissButton loginMarker={loginMarker} />
    </section>
  );
}
