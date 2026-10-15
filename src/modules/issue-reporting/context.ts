/**
 * Pure helpers that shape a staff report into a GitHub issue title and body.
 * Kept free of I/O so they are unit-testable.
 */

export interface IssueContext {
  route: string;
  environment: string;
  staffName: string;
  staffUsername: string;
  staffRoles: string[];
  timestamp: string;
  classId?: string | null;
  correlationId?: string | null;
  userAgent?: string | null;
}

const TITLE_PREFIX = "[app] ";
const TITLE_MAX = 200;

export function issueTitle(subject: string): string {
  const normalized = subject.trim().replace(/\s+/g, " ");
  const room = TITLE_MAX - TITLE_PREFIX.length;
  const body =
    normalized.length > room ? `${normalized.slice(0, room - 1)}…` : normalized;
  return `${TITLE_PREFIX}${body}`;
}

/** The class id from a `/staff/classes/<uuid>` route, when present. */
export function classIdFromRoute(route: string): string | null {
  const match = route.match(
    /^\/staff\/classes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:$|[/?#])/i,
  );
  return match?.[1] ?? null;
}

export function buildIssueBody(input: {
  description: string;
  context: IssueContext;
}): string {
  const c = input.context;
  const lines = [
    input.description.trim(),
    "",
    "---",
    "**Reported from the app**",
    "",
    `- Route: \`${c.route}\``,
    `- Environment: ${c.environment}`,
    `- Staff: ${c.staffName} (${c.staffUsername}) — ${c.staffRoles.join(", ") || "no roles"}`,
    `- Time: ${c.timestamp}`,
  ];
  if (c.classId) lines.push(`- Class: \`${c.classId}\``);
  if (c.correlationId) lines.push(`- Correlation: \`${c.correlationId}\``);
  lines.push(`- User agent: ${c.userAgent ?? "unknown"}`);
  return lines.join("\n");
}
