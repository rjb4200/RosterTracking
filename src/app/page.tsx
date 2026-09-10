import Image from "next/image";
import Link from "next/link";

import {
  buildClassSignInUrl,
  createClassQrDataUrl,
} from "@/modules/classes/qr";
import { listPublicOpenClasses } from "@/modules/classes/services";
import { formatDepartmentDateTime } from "@/modules/classes/time";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const classes = await listPublicOpenClasses(getDatabase());

  return (
    <main className="landing-shell">
      <section className="landing-copy">
        <p className="eyebrow">Fire / EMS Training Records</p>
        <h1>Training records that hold up after the class ends.</h1>
        <p className="lede">
          Fast attendance, clear instructor review, and durable reporting
          history for department and off-site training.
        </p>
        <nav className="landing-actions" aria-label="Staff access paths">
          <Link className="button button-primary" href="/instructor/login">
            Instructor access
          </Link>
          <Link className="button button-primary" href="/admin/login">
            Training administration
          </Link>
          <span className="student-note">
            Students can select an open class or scan its QR code to begin
            attendance.
          </span>
        </nav>
      </section>
      <aside className="public-class-directory" aria-label="Open classes">
        <p className="status-label">Open classes</p>
        {classes.length === 0 ? (
          <p className="public-class-empty">No classes are open for sign-in.</p>
        ) : (
          <ul className="public-class-list">
            {
              await Promise.all(
                classes.map(async (classRecord) => {
                  const signInUrl = buildClassSignInUrl(classRecord.publicCode);
                  const qrDataUrl = await createClassQrDataUrl(signInUrl);
                  return (
                    <li
                      className="public-class-card"
                      key={classRecord.publicCode}
                    >
                      <h2>{classRecord.courseName}</h2>
                      <p>
                        {classRecord.nextSession
                          ? formatDepartmentDateTime(classRecord.nextSession)
                          : "Session time pending"}
                      </p>
                      <p>{classRecord.location}</p>
                      <p>
                        {classRecord.instructors.join(", ") ||
                          "Instructor assigned"}
                      </p>
                      <Link
                        className="button button-primary"
                        href={`/${classRecord.publicCode}`}
                      >
                        Student sign-in
                      </Link>
                      <details>
                        <summary>Show QR code</summary>
                        <Image
                          alt={`QR code for ${classRecord.courseName}`}
                          height={220}
                          src={qrDataUrl}
                          unoptimized
                          width={220}
                        />
                      </details>
                    </li>
                  );
                }),
              )
            }
          </ul>
        )}
      </aside>
    </main>
  );
}
