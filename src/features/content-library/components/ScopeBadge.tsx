import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Base = shared catalogue (tenant 0, read-only here); Custom = added by this coaching. */
export function ScopeBadge({ base }: { base: boolean }) {
  return base ? (
    <Badge variant="success" title="Shared catalogue — read-only">
      Base
    </Badge>
  ) : (
    <Badge variant="warning" title="Added by your coaching">
      Custom
    </Badge>
  )
}

export function ReadOnlyMark({ what }: { what: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label={`Base ${what} — read-only`}
        >
          <Lock className="size-4" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent>Base {what}s are shared and can&apos;t be edited</TooltipContent>
    </Tooltip>
  )
}
