import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "../../staff/login/login-form";

export const metadata: Metadata = { title: "Training administration access" };

export default function AdminLoginPage() {
  return (
    <main className="workflow-login workflow-login-admin">
      <aside className="workflow-login-aside" aria-hidden="true">
        <span>Training administration</span>
        <strong>Review.</strong>
        <strong>Report.</strong>
        <strong>Retain.</strong>
      </aside>
      <section className="workflow-login-panel">
        <Link className="back-link" href="/">
          Roster Command
        </Link>
        <p className="eyebrow">Training administration</p>
        <h1 className="login-title">Keep the record in command.</h1>
        <p className="login-copy">
          Sign in to manage reporting, finalized records, department reference
          data, and staff access.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
