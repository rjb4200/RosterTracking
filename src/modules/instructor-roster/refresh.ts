import { ROSTER_REFRESH_GRACE_HOURS } from "@/modules/classes/constants";

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export interface RosterCorrectionCredential {
  credentialTypeId: string;
  code: string;
  name: string;
  currentValue: string;
  valid: boolean;
}

export interface RosterRefreshEntry {
  id: string;
  name: string;
  agencyName: string | null;
  signedInAt: string;
  signedInAtLabel: string;
  creditedHours: string | null;
  corrections: RosterCorrectionCredential[];
}

export interface RosterRefreshPayload {
  status: string;
  scheduledHours: number;
  refreshDeadline: string | null;
  active: RosterRefreshEntry[];
}

/**
 * The instant the class page should stop refreshing its roster: the end of the
 * class's last scheduled session plus the grace period. Returns null when the
 * class has no sessions, so the caller can omit the deadline rather than fail.
 */
export function computeRosterRefreshDeadline(
  sessionEnds: readonly Date[],
  graceHours: number = ROSTER_REFRESH_GRACE_HOURS,
): Date | null {
  let latest: number | null = null;
  for (const end of sessionEnds) {
    const time = end.getTime();
    if (Number.isNaN(time)) continue;
    if (latest === null || time > latest) latest = time;
  }
  if (latest === null) return null;
  return new Date(latest + graceHours * MILLISECONDS_PER_HOUR);
}
