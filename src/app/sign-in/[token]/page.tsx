import { resolveOpenClassToken } from "@/modules/classes/services";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function ClassSignInPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveOpenClassToken(getDatabase(), token);
  return (
    <main className="login-shell public-sign-in-shell">
      <section className="login-panel">
        <p className="eyebrow">Roster Command</p>
        <h1 className="login-title">
          {resolved ? "Class sign-in is ready" : "Class sign-in unavailable"}
        </h1>
        <p className="login-copy">
          {resolved
            ? "Student identification and attendance confirmation will be added in the next phase."
            : "This class link is unavailable. Ask the instructor for the current sign-in code."}
        </p>
      </section>
    </main>
  );
}
