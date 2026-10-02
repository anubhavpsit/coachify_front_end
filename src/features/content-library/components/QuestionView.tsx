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
        'tw:text-sm tw:leading-relaxed tw:text-foreground tw:[&_h3]:mt-3 tw:[&_h3]:mb-1 tw:[&_h3]:text-base! tw:[&_img]:my-2 tw:[&_img]:max-h-72 tw:[&_img]:rounded-md tw:[&_ol]:list-decimal tw:[&_ol]:pl-5 tw:[&_ul]:list-disc tw:[&_ul]:pl-5 tw:[&_p]:my-1',
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
    <li className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-4">
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
        <span className="tw:text-sm tw:font-semibold tw:text-muted-foreground">Q{n}</span>
        <Badge variant="soft">Grade {q.grade}</Badge>
        {q.difficulty && (
          <Badge variant={DIFF[q.difficulty] ?? 'secondary'} className="tw:capitalize">
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
        <ul className="tw:m-0 tw:grid tw:list-none tw:gap-2 tw:p-0 tw:sm:grid-cols-2">
          {opts.map(([k, v]) => {
            const right = reveal && q.correct_answer === k
            return (
              <li key={k} className={cn('tw:flex tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:px-3 tw:py-1.5 tw:text-sm', right ? 'tw:border-success/50 tw:bg-success-soft' : 'tw:border-border')}>
                <span className={cn('tw:flex tw:size-6 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:text-xs tw:font-bold', right ? 'tw:bg-success tw:text-success-foreground' : 'tw:bg-muted tw:text-muted-foreground')}>
                  {right ? <Check className="tw:size-3.5" aria-label="Correct" /> : k.toUpperCase()}
                </span>
                <span>{v}</span>
              </li>
            )
          })}
        </ul>
      )}

      {answers === 'always' && q.question_type === 'true_false' && q.correct_answer && (
        <p className="tw:m-0 tw:text-sm">
          Answer: <strong className="tw:capitalize tw:text-success">{q.correct_answer}</strong>
        </p>
      )}

      {hasAnswer && (
        <div>
          <Button type="button" size="sm" variant={open ? 'soft' : 'outline'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {answers === 'always' ? (open ? 'Hide answer & solution' : 'Show answer & solution') : open ? 'Hide answer' : 'Show answer'}
            <ChevronDown className={cn('tw:transition-transform', open && 'tw:rotate-180')} aria-hidden="true" />
          </Button>
          {open && (
            <div className="tw:mt-2 tw:flex tw:flex-col tw:gap-2 tw:rounded-lg tw:border-l-4 tw:border-solid tw:border-y-0 tw:border-r-0 tw:border-success tw:bg-success-soft/50 tw:px-3 tw:py-2">
              {answers === 'on-demand' && q.question_type === 'true_false' && q.correct_answer && (
                <p className="tw:m-0 tw:text-sm">
                  <span className="tw:font-semibold">Correct answer: </span>
                  {q.correct_answer === 'true' ? 'True' : 'False'}
                </p>
              )}
              {written && q.answer_key && (
                <div className="tw:text-sm">
                  <span className="tw:font-semibold">Answer key</span>
                  <RichHtml html={q.answer_key} className="tw:whitespace-pre-wrap" />
                </div>
              )}
              {q.solution_html && (
                <div>
                  <span className="tw:text-sm tw:font-semibold">Solution</span>
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
