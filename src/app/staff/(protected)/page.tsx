export default function StaffHomePage() {
  return (
    <main className="staff-content">
      <p className="eyebrow">Staff workspace</p>
      <h1 className="staff-title">Foundation ready.</h1>
      <p className="staff-intro">
        Staff authentication and authorization are active. Class and attendance tools will be added in the next vertical slices.
      </p>
      <section className="foundation-grid" aria-label="Foundation status">
        <article><span>01</span><h2>Secure access</h2><p>Username and password with server-side account checks.</p></article>
        <article><span>02</span><h2>Durable data</h2><p>Neon PostgreSQL with reviewed, versioned migrations.</p></article>
        <article><span>03</span><h2>Audited changes</h2><p>Append-only security events from the beginning.</p></article>
      </section>
    </main>
  );
}
