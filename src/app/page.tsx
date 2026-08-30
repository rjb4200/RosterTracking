import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-copy">
        <p className="eyebrow">Fire / EMS Training Records</p>
        <h1>Training records that hold up after the class ends.</h1>
        <p className="lede">
          Fast attendance, clear instructor review, and durable reporting
          history for department and off-site training.
        </p>
        <div className="landing-actions">
          <Link className="button button-primary" href="/staff/login">
            Staff login
          </Link>
          <span className="student-note">
            Students sign in from the class QR code provided by the instructor.
          </span>
        </div>
      </section>
      <aside className="status-card" aria-label="Application priorities">
        <div className="status-mark" aria-hidden="true">
          RC
        </div>
        <p className="status-label">Roster Command</p>
        <ul>
          <li>Class-specific attendance</li>
          <li>Audited roster corrections</li>
          <li>Long-term record retention</li>
        </ul>
      </aside>
    </main>
  );
}
