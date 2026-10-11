/**
 * Shared guard for maintenance and data commands.
 *
 * Every command that migrates, seeds, imports, or administers a database must
 * refuse to run against a protected (production) database unless the operator
 * explicitly overrides. The protected names are configurable so that the guard
 * keeps meaning as environments are split; `RosterGenerator` remains protected
 * by default because it is the current production database name.
 *
 * See the `database-environments` capability.
 */

const DEFAULT_PROTECTED_DATABASE_NAMES = ["RosterGenerator"];

export function protectedDatabaseNames(): string[] {
  const raw = process.env.PROTECTED_DATABASE_NAMES;
  if (!raw) return DEFAULT_PROTECTED_DATABASE_NAMES;
  const names = raw
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return names.length > 0 ? names : DEFAULT_PROTECTED_DATABASE_NAMES;
}

export function databaseNameFromUrl(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

export function isProtectedDatabase(
  url: string,
  names: string[] = protectedDatabaseNames(),
): boolean {
  return names.includes(databaseNameFromUrl(url));
}

export function productionOverrideRequested(
  argv: string[] = process.argv,
): boolean {
  return (
    argv.includes("--allow-production") || process.env.ALLOW_PRODUCTION === "1"
  );
}

/**
 * Throws when the target is a protected database and no override was given.
 * Call this immediately after resolving the connection string, before opening a
 * pool, so a refused command performs no database work at all.
 */
export function assertNotProtectedTarget(
  url: string,
  commandName: string,
  override: boolean = productionOverrideRequested(),
): void {
  if (override) return;
  if (!isProtectedDatabase(url)) return;
  const name = databaseNameFromUrl(url);
  throw new Error(
    `Refusing to run '${commandName}' against the protected production database '${name}'. ` +
      "Pass --allow-production (or set ALLOW_PRODUCTION=1) for an approved production operation.",
  );
}
