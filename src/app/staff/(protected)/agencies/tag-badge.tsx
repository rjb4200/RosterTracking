import type { CSSProperties } from "react";

import {
  AGENCY_OTHER_SUBTYPE_LABELS,
  AGENCY_TAG_CODES,
} from "@/modules/reference/constants";
import type { AgencyTagView } from "@/modules/reference/services";

const TAG_COLORS: Record<string, string> = {
  [AGENCY_TAG_CODES.FIRE]: "var(--tag-fire)",
  [AGENCY_TAG_CODES.EMS]: "var(--tag-ems)",
  [AGENCY_TAG_CODES.LAW_ENFORCEMENT]: "var(--tag-law-enforcement)",
  [AGENCY_TAG_CODES.OTHER]: "var(--tag-other)",
  [AGENCY_TAG_CODES.VOLUNTEER]: "var(--tag-volunteer)",
  [AGENCY_TAG_CODES.CAREER]: "var(--tag-career)",
};

export function tagColor(code: string): string {
  return TAG_COLORS[code] ?? "var(--muted-foreground)";
}

export function tagDisplayLabel(
  tag: Pick<AgencyTagView, "name" | "subtype">,
): string {
  if (tag.subtype) {
    return AGENCY_OTHER_SUBTYPE_LABELS[tag.subtype] ?? tag.name;
  }
  return tag.name;
}

export function TagBadge({ tag }: { tag: AgencyTagView }) {
  return (
    <span
      className="tag-badge"
      style={{ "--tag-color": tagColor(tag.code) } as CSSProperties}
    >
      {tagDisplayLabel(tag)}
    </span>
  );
}

export function TagBadgeList({ tags }: { tags: AgencyTagView[] }) {
  if (tags.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="tag-badge-list">
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </span>
  );
}
