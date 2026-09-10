import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "../../staff/login/login-form";

export const metadata: Metadata = { title: "Instructor access" };

export default function InstructorLoginPage() {
  return (
    <main className="workflow-login workflow-login-instructor">
      <section className="workflow-login-panel">
        <Link className="back-link" href="/">
          Roster Command
        </Link>
        <p className="eyebrow">Instructor workspace</p>
        <h1 className="login-title">Run the class, not the paperwork.</h1>
        <p className="login-copy">
          Sign in to prepare attendance, open your class QR code, and complete
          the roster when training ends.
        </p>
        <LoginForm />
      </section>
      <aside className="workflow-login-aside" aria-hidden="true">
        <span>Class operations</span>
        <strong>Open.</strong>
        <strong>Attend.</strong>
        <strong>Complete.</strong>
      </aside>
    </main>
  );
}
