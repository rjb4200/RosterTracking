/**
 * Derive an attendee's initials for the Fire roster's initials column: the
 * first letter of the first name followed by the first letter of the last
 * name, uppercased with no separators ("Ada Lovelace" -> "AL"). A single-part
 * name yields that part's first letter alone.
 */
export function attendeeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
