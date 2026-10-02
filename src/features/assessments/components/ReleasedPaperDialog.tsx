import axios from 'axios'
import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { fetchReleasedPaper } from '../services/assessmentsService'
import QuestionBody from './QuestionBody'

/** The released question paper for a student (read-only; no answers). */
export default function ReleasedPaperDialog({ paper, onClose }: { paper: { id: number; title: string } | null; onClose: () => void }) {
  return (
    <Dialog open={!!paper} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">{paper && <Body key={paper.id} {...paper} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function Body({ id, title, onClose }: { id: number; title: string; onClose: () => void }) {
  const p = useAsync(() => fetchReleasedPaper(id), [id])
  const error = p.error ? (axios.isAxiosError(p.error) && p.error.response?.data?.message ? String(p.error.response.data.message) : 'Failed to load the question paper.') : null
  const qs = p.data?.questions ?? []

  return (
    <>
      <DialogHeader>
        <DialogTitle>Question paper</DialogTitle>
        <DialogDescription>
          {title}
          {p.data ? ` · ${qs.length} ${qs.length === 1 ? 'question' : 'questions'}${p.data.total_marks !== null ? ` · ${p.data.total_marks} marks` : ''}` : ''}
        </DialogDescription>
      </DialogHeader>
      {p.loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading question paper">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <ol className="m-0 flex max-h-[60vh] list-none flex-col divide-y divide-border overflow-y-auto rounded-lg border border-solid border-border p-0">
          {qs.map((q, i) => (
            <li key={q.id} className="flex gap-3 p-3">
              <span className="w-6 shrink-0 text-right text-sm font-semibold text-muted-foreground">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <QuestionBody q={q} />
              </div>
              <span className="shrink-0 self-start rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">{q.marks ?? '—'} m</span>
            </li>
          ))}
        </ol>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  )
}
