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
    <div className="flex min-w-0 flex-col gap-1">
      <div className="text-sm text-foreground [&_p]:m-0" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.question_html || '') }} />
      {opts.length > 0 && (
        <ul className="m-0 grid list-none gap-x-4 gap-y-0.5 p-0 sm:grid-cols-2">
          {opts.map(([k, v]) => (
            <li key={k} className="text-xs text-muted-foreground">
              ({k}) {stripHtml(String(v))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

