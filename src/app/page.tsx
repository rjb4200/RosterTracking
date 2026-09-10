import Link from "next/link";

export default function HomePage() {
  return (
    <main className="entry-shell">
      <header className="entry-header">
        <span className="entry-brand">Roster Command</span>
        <span className="entry-region">Fire / EMS Training Records</span>
      </header>
      <section className="entry-intro">
        <p className="eyebrow">Choose your workspace</p>
        <h1>Start where your training work happens.</h1>
        <p className="lede">
          Class operations and department oversight use the same secure staff
          account, with a focused entry point for each workflow.
        </p>
      </section>
      <section className="entry-paths" aria-label="Staff access paths">
        <Link
          className="entry-path entry-path-instructor"
          href="/instructor/login"
        >
          <span className="entry-path-kicker">For instructors</span>
          <strong>Run a class</strong>
          <span>
            Create classes, open attendance, display QR codes, and complete
            rosters.
          </span>
          <span className="entry-path-action">Instructor access</span>
        </Link>
        <Link className="entry-path entry-path-admin" href="/admin/login">
          <span className="entry-path-kicker">
            For Training Majors and Administrators
          </span>
          <strong>Manage training</strong>
          <span>
            Review reporting, records, reference data, and staff access.
          </span>
          <span className="entry-path-action">Training administration</span>
        </Link>
      </section>
      <aside className="entry-student-note" aria-label="Student attendance">
        <span className="entry-student-mark" aria-hidden="true">
          QR
        </span>
        <div>
          <p>Attending a class?</p>
          <span>
            Scan the class QR code supplied by your instructor to record your
            attendance.
          </span>
        </div>
      </aside>
    </main>
  );
}
