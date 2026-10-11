import type { ReactNode } from "react"

import {
  PagePrimaryAction,
  type PageActionSize,
} from "@/components/ui/page-action"
import { cn } from "@/lib/utils"

// One presentation primitive for staff page and section headings, mirroring
// `EmptyState`: content is passed as props, the taxonomy is expressed by which
// props are supplied, and routing stays out of this component.
function PageHeading({
  eyebrow,
  title,
  titleAs = "h1",
  meta,
  primary,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  titleAs?: "h1" | "h2"
  meta?: ReactNode
  primary?: { href: string; label: ReactNode; size?: PageActionSize }
  actions?: ReactNode
  className?: string
}) {
  const Title = titleAs
  const hasActions = Boolean(primary || actions)

  return (
    <div data-slot="page-heading" className={cn("admin-heading", className)}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <Title className={titleAs === "h1" ? "staff-title" : undefined}>
          {title}
        </Title>
        {meta}
      </div>
      {hasActions ? (
        <div className="admin-actions">
          {primary ? (
            <PagePrimaryAction
              href={primary.href}
              label={primary.label}
              size={primary.size}
            />
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export { PageHeading }
