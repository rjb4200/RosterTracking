"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { RosterRefreshPayload } from "@/modules/instructor-roster/refresh";

import {
  type CredentialCorrectionActionState,
  CredentialCorrectionControl,
} from "./credential-correction-control";

const ROSTER_REFRESH_INTERVAL_MS = 10_000;

/**
 * Shows the open class roster and keeps it current while the class is open.
 *
 * Refreshing stops for three independent reasons, so an unattended page cannot
 * hold the database compute awake: the class leaving `open`, the tab becoming
 * hidden (paused, not stopped), and the server-provided deadline passing.
 */
export function LiveRoster({
  classId,
  hostAgencyName,
  initialRoster,
  tokenPanel,
  correctionAction,
}: {
  classId: string;
  hostAgencyName: string;
  initialRoster: RosterRefreshPayload;
  tokenPanel: ReactNode;
  correctionAction: (
    prev: CredentialCorrectionActionState | undefined,
    formData: FormData,
  ) => Promise<CredentialCorrectionActionState>;
}) {
  const router = useRouter();
  const [roster, setRoster] = useState(initialRoster);
  const refreshDeadline = initialRoster.refreshDeadline;

  // Re-sync when the server re-renders after a roster correction.
  useEffect(() => {
    setRoster(initialRoster);
  }, [initialRoster]);

  useEffect(() => {
    const deadline = refreshDeadline
      ? new Date(refreshDeadline).getTime()
      : null;
    const expired = () => deadline !== null && Date.now() >= deadline;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const poll = async () => {
      if (cancelled || inFlight) return;
      if (expired()) {
        stop();
        return;
      }
      inFlight = true;
      try {
        const response = await fetch(`/api/staff/class-roster/${classId}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!response.ok) {
          // The class is gone or no longer accessible; stop quietly.
          stop();
          return;
        }
        const payload = (await response.json()) as RosterRefreshPayload;
        if (cancelled) return;
        if (payload.status !== "open") {
          stop();
          router.refresh();
          return;
        }
        setRoster(payload);
      } catch {
        // A transient failure keeps the current roster until the next poll.
      } finally {
        inFlight = false;
      }
    };

    const start = () => {
      if (cancelled || timer !== null || expired()) return;
      timer = setInterval(() => void poll(), ROSTER_REFRESH_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" || expired()) {
        stop();
        return;
      }
      void poll();
      start();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [classId, refreshDeadline, router]);

  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Live class</p>
          <h2>{roster.active.length} signed-in students</h2>
          <p>Host agency: {hostAgencyName}</p>
        </div>
        <Link
          href={`/staff/classes/${classId}/sign-in-record`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Sign-in record
        </Link>
      </div>
      {tokenPanel}
      <div className="command-roster">
        <div>
          <h3>Roster</h3>
          <ul className="roster-list">
            {roster.active.map((entry) => (
              <li key={entry.id} className="roster-row">
                <div>
                  <strong>{entry.name}</strong>
                  <span>
                    {entry.agencyName ?? "No agency"} | {entry.signedInAtLabel}
                  </span>
                </div>
                <Badge variant="outline">
                  {entry.creditedHours ?? roster.scheduledHours} hours
                </Badge>
                {entry.corrections.length > 0 ? (
                  <CredentialCorrectionControl
                    classId={classId}
                    attendanceId={entry.id}
                    participantName={entry.name}
                    credentials={entry.corrections}
                    action={correctionAction}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
