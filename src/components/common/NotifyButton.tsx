import { AnimatePresence, m } from 'motion/react'
import { BellRing, Check, RotateCcw } from 'lucide-react'
import { pop } from '@/animations'
import { Button } from '@/components/ui/button'
import type { NotifyState } from '@/hooks/useNotifyStates'
import { cn } from '@/lib/utils'

const LABELS: Record<NotifyState, string> = { idle: 'Notify', sending: 'Sending…', sent: 'Notified', error: 'Retry' }

/** Reminder button: idle → sending (spinner) → sent (check, disabled) / error (retry). */
export default function NotifyButton({ state, onClick, title }: { state: NotifyState; onClick: () => void; title?: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={state === 'sent' ? 'soft' : 'outline'}
      loading={state === 'sending'}
      disabled={state === 'sent'}
      onClick={onClick}
      title={title}
      className={cn(
        'tw:min-w-24',
        state === 'sent' && 'tw:bg-success-soft tw:text-success tw:disabled:opacity-100',
        state === 'error' && 'tw:border-destructive/40 tw:text-destructive',
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'sent' ? (
          <m.span key="sent" variants={pop} initial="hidden" animate="visible" className="tw:inline-flex">
            <Check aria-hidden="true" />
          </m.span>
        ) : state === 'error' ? (
          <RotateCcw key="err" aria-hidden="true" />
        ) : state === 'idle' ? (
          <BellRing key="idle" aria-hidden="true" />
        ) : null}
      </AnimatePresence>
      {LABELS[state]}
    </Button>
  )
}
