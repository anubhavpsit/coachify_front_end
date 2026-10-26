import { useState } from 'react'
import { FileKey2, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { fetchWorksheetPdf, type PrintOptions } from '../services/worksheetsService'

interface Props {
  worksheet: { id: number; title: string; questions_count: number } | null
  onClose: () => void
}

const SETS: { value: PrintOptions['set']; label: string; hint: string }[] = [
  { value: '', label: 'Single version', hint: 'Questions in the saved order.' },
  { value: 'A', label: 'Set A', hint: 'Saved order, marked “SET A”.' },
  { value: 'B', label: 'Set B', hint: 'Questions and MCQ options shuffled, so neighbours can’t copy.' },
]

/** Student copy or answer key, single / Set A / Set B → PDF in a new tab. */
export default function PrintWorksheetDialog({ worksheet, onClose }: Props) {
  const [opts, setOpts] = useState<PrintOptions>({ copy: 'student', set: '', explanations: true })
  const [busy, setBusy] = useState(false)

  const open = async () => {
    if (!worksheet) return
    setBusy(true)
    try {
      const url = URL.createObjectURL(await fetchWorksheetPdf(worksheet.id, opts))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error('Failed to generate the PDF.')
    } finally {
      setBusy(false)
    }
  }

  const choice = (active: boolean) =>
    cn('m-0 flex cursor-pointer items-start gap-3 rounded-lg border border-solid p-3 text-sm', active ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted/50')

  return (
    <Dialog open={!!worksheet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Print worksheet</DialogTitle>
          <DialogDescription>
            {worksheet?.title} · {worksheet?.questions_count} {worksheet?.questions_count === 1 ? 'question' : 'questions'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Copy" className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: 'student', label: 'Student copy', hint: 'Name / roll boxes, space to write, no answers.', Icon: FileText },
                { value: 'answers', label: 'Answer key', hint: 'Answers for you to check with — not for students.', Icon: FileKey2 },
              ] as const
            ).map(({ value, label, hint, Icon }) => (
              <button key={value} type="button" role="radio" aria-checked={opts.copy === value} className={cn(choice(opts.copy === value), 'bg-transparent text-left')} onClick={() => setOpts((o) => ({ ...o, copy: value }))}>
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </div>

          <div role="radiogroup" aria-label="Version" className="flex flex-col gap-2">
            {SETS.map((s) => (
              <button key={s.label} type="button" role="radio" aria-checked={opts.set === s.value} className={cn(choice(opts.set === s.value), 'bg-transparent text-left')} onClick={() => setOpts((o) => ({ ...o, set: s.value }))}>
                <span className="flex flex-col">
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </button>
            ))}
          </div>

          {opts.copy === 'answers' && (
            <label className="m-0 flex items-center gap-2 text-sm">
              <Checkbox checked={opts.explanations} onCheckedChange={(v) => setOpts((o) => ({ ...o, explanations: v === true }))} /> Include explanations
            </label>
          )}
          {opts.set === 'B' && opts.copy === 'student' && <p className="m-0 text-xs text-muted-foreground">Print the Set B answer key too — its answers are in a different order.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={open} disabled={busy}>
            <Printer aria-hidden="true" /> {busy ? 'Preparing PDF…' : 'Open PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
