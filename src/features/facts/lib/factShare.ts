import type { Fact } from '../services/factsService'

/** Readable text of a question fact's HTML (question + "(a) option" lines). */
function questionText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const options = doc.querySelector('ol[type="a"]')
  const lines = options ? Array.from(options.querySelectorAll('li'), (li, i) => `(${String.fromCharCode(97 + i)}) ${li.textContent?.trim() ?? ''}`) : []
  options?.remove()
  const question = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
  return [question, ...lines].filter(Boolean).join('\n')
}

/** Text to share for a fact — question facts as plain text, never with the answer (same as the mobile app). */
export function shareText(f: Pick<Fact, 'title' | 'content' | 'fact_kind'>): string {
  const body = f.fact_kind === 'question' ? questionText(f.content ?? '') : (f.content ?? '')
  return `${f.title}${body ? `\n\n${body}` : ''}`
}
