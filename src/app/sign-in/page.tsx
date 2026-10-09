import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { SIGN_IN_CONTEXT_COOKIE_NAME } from "@/modules/student-sign-in/context";
import {
  buildSignInPageModel,
  type SignInPageModel,
} from "@/modules/student-sign-in/page-model";
import { getDatabase } from "@/server/db/client";

import {
  confirmProfile,
  confirmRecognizedSignIn,
  confirmSignIn,
  lookupCurrentPhone,
  notMe,
  recoverChangedPhone,
  saveGuestDetails,
  saveNewStudentDetails,
  saveRegularDetails,
} from "./actions";
import { SubmitButton } from "./submit-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Class sign-in",
  referrer: "no-referrer",
};

const NOTICES: Record<string, string> = {
  limited:
    "Sign-in is temporarily unavailable. Wait a few minutes and try again.",
  "not-found":
    "We could not continue with that phone number. You can try again, use changed-number recovery, or sign in as a guest.",
  recovery:
    "We could not verify those details. Check your entries or use guest sign-in.",
  required: "Complete every required field and choose an active agency.",
  unable: "We could not continue sign-in. Check your entries and try again.",
};

/**
 * Shows the address the completion certificate will be emailed to so the
 * participant can confirm it before signing in. The certificate is the reason
 * the email must be right, so it is surfaced with the identity at the top.
 */
function CertificateEmail({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <p className="recognized-email">
      Completion certificate emailed to <strong>{email}</strong>
    </p>
  );
}

function Unavailable() {
  return (
    <SignInShell eyebrow="Class access" title="Class sign-in unavailable">
      <p className="sign-in-copy">
        This sign-in session is unavailable or expired. Ask the instructor for
        the current class sign-in code and start again.
      </p>
    </SignInShell>
  );
}

function SignInShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="public-sign-in-page">
      <section className="public-sign-in-card">
        <header className="sign-in-header">
          <span className="sign-in-mark" aria-hidden="true">
            RC
          </span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="sign-in-title">{title}</h1>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

function Notice({ notice }: { notice?: string }) {
  const message = notice ? NOTICES[notice] : undefined;
  return message ? (
    <p className="sign-in-alert" role="alert" aria-live="polite">
      {message}
    </p>
  ) : null;
}

function AgencyField({
  agencies,
  preselectedAgencyId,
}: {
  agencies: { id: string; name: string }[];
  preselectedAgencyId?: string | null;
}) {
  return (
    <div className="sign-in-field">
      <label htmlFor="agencyId">Agency represented today</label>
      <select
        id="agencyId"
        name="agencyId"
        required
        defaultValue={preselectedAgencyId ?? ""}
      >
        <option value="" disabled>
          Select an agency
        </option>
        {agencies.map((agency) => (
          <option key={agency.id} value={agency.id}>
            {agency.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RequirementFields({
  model,
}: {
  model: {
    fields: { key: string; label: string }[];
    credentials: { id: string; code: string }[];
    agencies: { id: string; name: string }[];
    preselectedAgencyId?: string | null;
  };
}) {
  return (
    <>
      {model.fields.map((field) => (
        <div className="sign-in-field" key={field.key}>
          <label htmlFor={`field-${field.key}`}>{field.label}</label>
          <input
            autoComplete={field.key === "email" ? "email" : "off"}
            id={`field-${field.key}`}
            name={`field:${field.key}`}
            required
            type={field.key === "email" ? "email" : "text"}
          />
        </div>
      ))}
      {model.credentials.map((credential) => (
        <div className="sign-in-field" key={credential.id}>
          <label htmlFor={`credential-${credential.id}`}>
            {credential.code.toUpperCase()}
          </label>
          <input
            autoComplete="off"
            id={`credential-${credential.id}`}
            name={`credential:${credential.id}`}
            required
            type="text"
          />
        </div>
      ))}
      <AgencyField
        agencies={model.agencies}
        preselectedAgencyId={model.preselectedAgencyId ?? null}
      />
    </>
  );
}

function Wizard({
  model,
  notice,
}: {
  model: SignInPageModel;
  notice?: string;
}) {
  if (model.step === "phone") {
    return (
      <>
        <p className="sign-in-copy">
          Enter the mobile number on your student profile. We only use an exact
          match and never show a list of students.
        </p>
        <Notice notice={notice} />
        <form action={lookupCurrentPhone} className="sign-in-form">
          <div className="sign-in-field">
            <label htmlFor="phone">Current phone number</label>
            <input
              autoComplete="tel"
              id="phone"
              inputMode="tel"
              name="phone"
              required
              type="tel"
            />
          </div>
          <SubmitButton pendingLabel="Checking...">Continue</SubmitButton>
        </form>
        <nav className="sign-in-options" aria-label="Other sign-in options">
          {notice === "not-found" ? (
            <Link href="/sign-in?step=recovery">My phone number changed</Link>
          ) : null}
          <Link className="guest-link" href="/sign-in?step=guest">
            Sign in as a guest
          </Link>
        </nav>
      </>
    );
  }

  if (model.step === "recovery") {
    return (
      <>
        <p className="sign-in-copy">
          Enter your previous phone number and choose one credential. The same
          choices are always shown for privacy.
        </p>
        <Notice notice={notice} />
        <form action={recoverChangedPhone} className="sign-in-form">
          <div className="sign-in-field">
            <label htmlFor="priorPhone">Previous phone number</label>
            <input
              id="priorPhone"
              inputMode="tel"
              name="priorPhone"
              required
              type="tel"
            />
          </div>
          <fieldset className="sign-in-choice-group">
            <legend>Credential type</legend>
            <label>
              <input name="credentialType" required type="radio" value="ffn" />
              FFN
            </label>
            <label>
              <input
                name="credentialType"
                required
                type="radio"
                value="kemsis"
              />
              KEMSIS ID
            </label>
          </fieldset>
          <div className="sign-in-field">
            <label htmlFor="credentialValue">Credential value</label>
            <input
              autoComplete="off"
              id="credentialValue"
              name="credentialValue"
              required
            />
          </div>
          <SubmitButton pendingLabel="Verifying...">
            Verify my profile
          </SubmitButton>
        </form>
        <Link className="sign-in-back" href="/sign-in">
          Back to phone entry
        </Link>
      </>
    );
  }

  if (model.step === "confirm-profile") {
    return (
      <>
        <p className="sign-in-kicker">Is this you?</p>
        <p className="recognized-name">{model.participantName}</p>
        <CertificateEmail email={model.email} />
        <p className="sign-in-copy">
          {model.recovered
            ? "Confirm this profile before the new phone number is staged. It changes only after attendance succeeds."
            : "Confirm the recognized profile before continuing."}
        </p>
        {model.recovered && model.maskedCredentials.length > 0 ? (
          <ul
            className="recovered-credentials"
            aria-label="Credentials on file"
          >
            {model.maskedCredentials.map((credential) => (
              <li key={credential.code}>
                {credential.code.toUpperCase()} ending {credential.maskedSuffix}
              </li>
            ))}
          </ul>
        ) : null}
        <Notice notice={notice} />
        <div className="sign-in-action-stack">
          <form action={confirmProfile}>
            <SubmitButton pendingLabel="Continuing...">
              Yes, continue
            </SubmitButton>
          </form>
          <form action={notMe}>
            <SubmitButton pendingLabel="Clearing..." secondary>
              Not me
            </SubmitButton>
          </form>
        </div>
      </>
    );
  }

  if (model.step === "recognized") {
    return (
      <>
        <p className="sign-in-kicker">Is this you?</p>
        <p className="recognized-name">{model.participantName}</p>
        <CertificateEmail email={model.email} />
        {model.maskedCredentials.length > 0 ? (
          <ul
            className="recovered-credentials"
            aria-label="Credentials on file"
          >
            {model.maskedCredentials.map((credential) => (
              <li key={credential.code}>
                {credential.code.toUpperCase()} ending {credential.maskedSuffix}
              </li>
            ))}
          </ul>
        ) : null}
        <Notice notice={notice} />
        <form action={confirmRecognizedSignIn} className="sign-in-form">
          {model.fields.length > 0 || model.credentials.length > 0 ? (
            <details className="sign-in-update" open>
              <summary>Update my information</summary>
              <RequirementFields model={model} />
            </details>
          ) : (
            <AgencyField
              agencies={model.agencies}
              preselectedAgencyId={model.preselectedAgencyId}
            />
          )}
          <blockquote className="attestation">{model.attestation}</blockquote>
          <SubmitButton pendingLabel="Signing in...">
            Confirm &amp; Sign In
          </SubmitButton>
        </form>
        <form action={notMe}>
          <SubmitButton secondary>Not me</SubmitButton>
        </form>
      </>
    );
  }

  if (model.step === "regular-details") {
    return (
      <>
        <p className="sign-in-kicker">Signing in as</p>
        <p className="recognized-name">{model.participantName}</p>
        <CertificateEmail email={model.email} />
        <p className="sign-in-copy">
          Complete any class-required details and select the agency you
          represent.
        </p>
        <Notice notice={notice} />
        <form action={saveRegularDetails} className="sign-in-form">
          <RequirementFields model={model} />
          <SubmitButton pendingLabel="Saving...">Review sign-in</SubmitButton>
        </form>
        <form action={notMe}>
          <SubmitButton secondary>Not me</SubmitButton>
        </form>
      </>
    );
  }

  if (model.step === "new-student-details") {
    return (
      <>
        <p className="sign-in-copy">
          We could not find that phone number. Create your profile to sign in.
          It takes a few seconds and is saved for next time.
        </p>
        <Notice notice={notice} />
        <form action={saveNewStudentDetails} className="sign-in-form">
          <div className="sign-in-name-grid">
            <div className="sign-in-field">
              <label htmlFor="firstName">First name</label>
              <input
                autoComplete="given-name"
                id="firstName"
                name="firstName"
                required
              />
            </div>
            <div className="sign-in-field">
              <label htmlFor="lastName">Last name</label>
              <input
                autoComplete="family-name"
                id="lastName"
                name="lastName"
                required
              />
            </div>
          </div>
          <div className="sign-in-field">
            <label htmlFor="phone">Mobile phone number</label>
            <input
              autoComplete="tel"
              defaultValue={model.phone}
              id="phone"
              inputMode="tel"
              name="phone"
              required
              type="tel"
            />
          </div>
          <RequirementFields model={model} />
          <SubmitButton pendingLabel="Saving...">
            Create account &amp; continue
          </SubmitButton>
        </form>
        <nav className="sign-in-options" aria-label="Other sign-in options">
          <Link href="/sign-in?step=recovery">My phone number changed</Link>
          <Link className="guest-link" href="/sign-in?step=guest">
            Sign in as a guest
          </Link>
        </nav>
      </>
    );
  }

  if (model.step === "guest-details") {
    return (
      <>
        <p className="sign-in-copy">
          Guest attendance is saved only for this class. It will not create a
          student profile or remember this device.
        </p>
        <Notice notice={notice} />
        <form action={saveGuestDetails} className="sign-in-form">
          <div className="sign-in-name-grid">
            <div className="sign-in-field">
              <label htmlFor="firstName">First name</label>
              <input
                autoComplete="given-name"
                id="firstName"
                name="firstName"
                required
              />
            </div>
            <div className="sign-in-field">
              <label htmlFor="lastName">Last name</label>
              <input
                autoComplete="family-name"
                id="lastName"
                name="lastName"
                required
              />
            </div>
          </div>
          <RequirementFields model={model} />
          <SubmitButton pendingLabel="Saving...">
            Review guest sign-in
          </SubmitButton>
        </form>
        <Link className="sign-in-back" href="/sign-in">
          Try regular student sign-in
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="sign-in-kicker">Final confirmation</p>
      <blockquote className="attestation">{model.attestation}</blockquote>
      <p className="sign-in-copy">
        Selecting the button below records your attendance and the exact
        statement above.
      </p>
      <Notice notice={notice} />
      <form action={confirmSignIn} className="sign-in-form">
        <SubmitButton pendingLabel="Signing in...">
          Confirm &amp; Sign In
        </SubmitButton>
      </form>
    </>
  );
}

export default async function PublicSignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    step?: string;
    notice?: string;
  }>;
}) {
  const query = await searchParams;
  if (query.status === "success" || query.status === "already-signed-in") {
    return (
      <SignInShell eyebrow="Attendance recorded" title="You're signed in">
        <p className="sign-in-copy" role="status">
          {query.status === "already-signed-in"
            ? "Your attendance was already recorded. No duplicate was created."
            : "Your attendance was recorded successfully. You may close this page."}
        </p>
      </SignInShell>
    );
  }
  if (query.status === "unavailable") return <Unavailable />;

  const signedContext = (await cookies()).get(
    SIGN_IN_CONTEXT_COOKIE_NAME,
  )?.value;
  if (!signedContext) return <Unavailable />;

  let model: SignInPageModel | null = null;
  try {
    model = await buildSignInPageModel(
      getDatabase(),
      signedContext,
      query.step,
    );
  } catch {
    model = null;
  }
  if (!model) return <Unavailable />;

  return (
    <SignInShell eyebrow="Student attendance" title="Class sign-in">
      <Wizard model={model} notice={query.notice} />
    </SignInShell>
  );
}
