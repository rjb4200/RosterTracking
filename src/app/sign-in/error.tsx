"use client";

export default function SignInError({ reset }: { reset: () => void }) {
  return (
    <main className="public-sign-in-page">
      <section className="public-sign-in-card">
        <header className="sign-in-header">
          <span className="sign-in-mark" aria-hidden="true">
            RC
          </span>
          <div>
            <p className="eyebrow">Class access</p>
            <h1 className="sign-in-title">Class sign-in unavailable</h1>
          </div>
        </header>
        <p className="sign-in-copy">
          We could not complete sign-in. Try again, or ask the instructor for
          the current class sign-in code.
        </p>
        <div className="sign-in-action-stack">
          <button
            className="sign-in-button"
            onClick={() => reset()}
            type="button"
          >
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
