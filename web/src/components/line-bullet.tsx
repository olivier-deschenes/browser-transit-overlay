import type { CatalogLine } from 'virtual:extension-catalog'

import { cn } from '@/lib/utils'

// A line the way its network prints it: its short name on a disc of its
// colour, stretched into a pill for the longer ones (3bis, NWK–WTC). The name
// beside it is what a screen reader reads, so the bullet itself is hidden.
export function LineBullet({
  line,
  className,
}: {
  line: Pick<CatalogLine, 'badge' | 'color' | 'ink'>
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs leading-none font-semibold whitespace-nowrap',
        className,
      )}
      style={{ backgroundColor: line.color, color: line.ink }}
    >
      {line.badge}
    </span>
  )
}

// A line as a dot of its colour, for rows that list a whole network at once.
// The ring keeps the palest of them (BART's yellow) from vanishing into the
// page.
export function LineDot({ line }: { line: Pick<CatalogLine, 'color'> }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/15"
      style={{ backgroundColor: line.color }}
    />
  )
}
