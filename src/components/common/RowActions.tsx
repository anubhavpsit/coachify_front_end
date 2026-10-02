import type { ReactNode } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function IconAction({ label, onClick, children, destructive }: { label: string; onClick: () => void; children: ReactNode; destructive?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          className={destructive ? 'text-destructive hover:bg-destructive-soft hover:text-destructive' : undefined}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Edit / Delete icon buttons with tooltips and accessible names (the legacy ones had none). */
export default function RowActions({ name, onEdit, onDelete }: { name: string; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <IconAction label={`Edit ${name}`} onClick={onEdit}>
          <Pencil aria-hidden="true" />
        </IconAction>
      )}
      {onDelete && (
        <IconAction label={`Delete ${name}`} onClick={onDelete} destructive>
          <Trash2 aria-hidden="true" />
        </IconAction>
      )}
    </div>
  )
}
