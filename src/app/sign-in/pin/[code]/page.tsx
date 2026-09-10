import { redirect } from "next/navigation";

import { resolveOpenClassPublicCode } from "@/modules/classes/services";
import { isClassPublicCode } from "@/modules/classes/token";
import { getDatabase } from "@/server/db/client";

import { SubmitButton } from "../../submit-button";
import { submitAccessPin } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClassAccessPinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  if (!isClassPublicCode(code)) redirect("/sign-in?status=unavailable");
  const access = await resolveOpenClassPublicCode(getDatabase(), code);
  if (!access) redirect("/sign-in?status=unavailable");
  if (!access.accessPinEnabled) redirect(`/${code}`);

  return (
    <main className="public-sign-in-page">
      <section className="public-sign-in-card">
        <header className="sign-in-header">
          <span className="sign-in-mark" aria-hidden="true">
            RC
          </span>
          <div>
            <p className="eyebrow">Class access</p>
            <h1 className="sign-in-title">Enter class PIN</h1>
          </div>
        </header>
        <p className="sign-in-copy">
          Enter the four-digit PIN provided by your instructor to begin sign-in.
        </p>
        {query.notice === "invalid" ? (
          <p className="sign-in-alert" role="alert">
            The PIN was not accepted. Check it with your instructor and try
            again.
          </p>
        ) : null}
        <form action={submitAccessPin} className="sign-in-form">
          <input name="code" type="hidden" value={code} />
          <div className="sign-in-field">
            <label htmlFor="pin">Class PIN</label>
            <input
              autoComplete="one-time-code"
              id="pin"
              inputMode="numeric"
              maxLength={4}
              name="pin"
              pattern="[0-9]{4}"
              required
              type="text"
            />
          </div>
          <SubmitButton pendingLabel="Checking...">Continue</SubmitButton>
        </form>
      </section>
    </main>
  );
}
