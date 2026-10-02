import type { ReactNode } from 'react'

/** Marks case-insensitive occurrences of `query` inside `text`. */
export default function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase()
  if (!q) return <>{text}</>
  const parts: ReactNode[] = []
  const lower = text.toLowerCase()
  let from = 0
  for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, from)) {
    if (at > from) parts.push(text.slice(from, at))
    parts.push(
      <mark key={at} className="rounded-[3px] bg-primary-soft p-0! text-primary-soft-foreground">
        {text.slice(at, at + q.length)}
      </mark>,
    )
    from = at + q.length
  }
  if (from < text.length) parts.push(text.slice(from))
  return <>{parts}</>
}
