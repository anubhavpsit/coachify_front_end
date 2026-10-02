import DOMPurify from 'dompurify'
import type { PaperQuestion } from '../services/assessmentsService'

/** Plain text of (sanitised) HTML. Sanitise first: a detached element still runs `<img onerror>`. */
// eslint-disable-next-line react-refresh/only-export-components
export const stripHtml = (html?: string | null) => {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = DOMPurify.sanitize(html)
  return (el.textContent || '').trim()
}

export default function QuestionBody({ q }: { q: PaperQuestion }) {
  const opts = (['a', 'b', 'c', 'd'] as const).map((k) => [k, q[`option_${k}`]] as const).filter(([, v]) => !!v)
  return (
    <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
      <div className="tw:text-sm tw:text-foreground tw:[&_p]:m-0" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.question_html || '') }} />
      {opts.length > 0 && (
        <ul className="tw:m-0 tw:grid tw:list-none tw:gap-x-4 tw:gap-y-0.5 tw:p-0 tw:sm:grid-cols-2">
          {opts.map(([k, v]) => (
            <li key={k} className="tw:text-xs tw:text-muted-foreground">
              ({k}) {stripHtml(String(v))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

