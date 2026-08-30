import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff login" };

export default function StaffLoginPage() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <Link className="back-link" href="/">
          Roster Command
        </Link>
        <p className="eyebrow">Department access</p>
        <h1 className="login-title">Staff login</h1>
        <p className="login-copy">
          Use the username and password provided by your administrator.
        </p>
        <LoginForm />
      </section>
      <aside className="login-aside" aria-hidden="true">
        <span>Ready</span>
        <strong>Train.</strong>
        <strong>Track.</strong>
        <strong>Retain.</strong>
      </aside>
    </main>
  );
}
