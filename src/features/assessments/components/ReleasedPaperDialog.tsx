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
      <DialogContent className="tw:sm:max-w-2xl">{paper && <Body key={paper.id} {...paper} onClose={onClose} />}</DialogContent>
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
        <div className="tw:flex tw:flex-col tw:gap-2" role="status" aria-label="Loading question paper">
          <Skeleton className="tw:h-14" />
          <Skeleton className="tw:h-14" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <ol className="tw:m-0 tw:flex tw:max-h-[60vh] tw:list-none tw:flex-col tw:divide-y tw:divide-border tw:overflow-y-auto tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-0">
          {qs.map((q, i) => (
            <li key={q.id} className="tw:flex tw:gap-3 tw:p-3">
              <span className="tw:w-6 tw:shrink-0 tw:text-right tw:text-sm tw:font-semibold tw:text-muted-foreground">{i + 1}.</span>
              <div className="tw:min-w-0 tw:flex-1">
                <QuestionBody q={q} />
              </div>
              <span className="tw:shrink-0 tw:self-start tw:rounded-full tw:bg-muted tw:px-2 tw:py-0.5 tw:text-xs tw:font-semibold tw:tabular-nums tw:text-muted-foreground">{q.marks ?? '—'} m</span>
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
