import Link from "next/link"
import type { VariantProps } from "class-variance-authority"
import type { ReactNode } from "react"

import { buttonVariants } from "@/components/ui/button"

// The only routing-aware piece of the heading kit. `PageHeading` stays
// presentational and never imports `next/link`; this leaf owns the destination
// and pins the primary variant so a page's main action cannot be mis-styled.
type PageActionSize = VariantProps<typeof buttonVariants>["size"]

function PagePrimaryAction({
  href,
  label,
  size,
}: {
  href: string
  label: ReactNode
  size?: PageActionSize
}) {
  return (
    <Link href={href} className={buttonVariants({ size })}>
      {label}
    </Link>
  )
}

export { PagePrimaryAction, type PageActionSize }
