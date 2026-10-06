import { useState, type ReactNode } from 'react'
import DOMPurify from 'dompurify'
import { Check, ChevronDown, ImageOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SUBJECTIVE_TYPES, typeLabel } from '../schemas/questionForm'
import type { Question } from '../services/contentLibraryService'

const DIFF: Record<string, 'success' | 'warning' | 'destructive'> = { easy: 'success', medium: 'warning', hard: 'destructive' }

/** Teacher-authored HTML — always sanitised. */
export function RichHtml({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        'text-sm leading-relaxed text-foreground [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-base! [&_img]:my-2 [&_img]:max-h-72 [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || '') }}
    />
  )
}

interface Props {
  q: Question
  n: number
  /** Extra badges / actions on the right of the header (e.g. Base badge, edit / delete). */
  headerEnd?: ReactNode
  /**
   * 'always' — correct option highlighted, answer & solution in a collapsible (admin bank).
   * 'on-demand' — nothing revealed until "Show answer" (teacher library, as before).
   */
  answers: 'always' | 'on-demand'
}

/** One question with its options, answer and solution. Option text renders as plain text (React escapes it). */
export default function QuestionView({ q, n, headerEnd, answers }: Props) {
  const [open, setOpen] = useState(false)
  const reveal = answers === 'always' || open
  const opts = (['a', 'b', 'c', 'd'] as const).map((k) => [k, q[`option_${k}`]] as const).filter(([, v]) => !!v) as [string, string][]
  const written = SUBJECTIVE_TYPES.includes(q.question_type ?? '')
  const hasAnswer = !!q.solution_html || (written && !!q.answer_key) || !!q.correct_answer

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-solid border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Q{n}</span>
        <Badge variant="soft">Grade {q.grade}</Badge>
        {q.difficulty && (
          <Badge variant={DIFF[q.difficulty] ?? 'secondary'} className="capitalize">
            {q.difficulty}
          </Badge>
        )}
        {q.question_type && <Badge variant="secondary">{typeLabel(q.question_type)}</Badge>}
        {q.needs_image && (
          <Badge variant="destructive" title={q.image_note ?? undefined}>
            <ImageOff aria-hidden="true" /> Needs image{answers === 'on-demand' && q.image_note ? `: ${q.image_note}` : ''}
          </Badge>
        )}
        {headerEnd}
      </div>

      <RichHtml html={q.question_html} />

      {q.question_type === 'mcq' && opts.length > 0 && (
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {opts.map(([k, v]) => {
            const right = reveal && (q.correct_answer ?? '').split(',').includes(k) // "a,c" = multiple correct
            return (
              <li key={k} className={cn('flex items-center gap-2 rounded-lg border border-solid px-3 py-1.5 text-sm', right ? 'border-success/50 bg-success-soft' : 'border-border')}>
                <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', right ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground')}>
                  {right ? <Check className="size-3.5" aria-label="Correct" /> : k.toUpperCase()}
                </span>
                <span>{v}</span>
              </li>
            )
          })}
        </ul>
      )}

      {answers === 'always' && q.question_type === 'true_false' && q.correct_answer && (
        <p className="m-0 text-sm">
          Answer: <strong className="capitalize text-success">{q.correct_answer}</strong>
        </p>
      )}

      {hasAnswer && (
        <div>
          <Button type="button" size="sm" variant={open ? 'soft' : 'outline'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {answers === 'always' ? (open ? 'Hide answer & solution' : 'Show answer & solution') : open ? 'Hide answer' : 'Show answer'}
            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </Button>
          {open && (
            <div className="mt-2 flex flex-col gap-2 rounded-lg border-l-4 border-solid border-y-0 border-r-0 border-success bg-success-soft/50 px-3 py-2">
              {answers === 'on-demand' && q.question_type === 'true_false' && q.correct_answer && (
                <p className="m-0 text-sm">
                  <span className="font-semibold">Correct answer: </span>
                  {q.correct_answer === 'true' ? 'True' : 'False'}
                </p>
              )}
              {written && q.answer_key && (
                <div className="text-sm">
                  <span className="font-semibold">Answer key</span>
                  <RichHtml html={q.answer_key} className="whitespace-pre-wrap" />
                </div>
              )}
              {q.solution_html && (
                <div>
                  <span className="text-sm font-semibold">Solution</span>
                  <RichHtml html={q.solution_html} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}
