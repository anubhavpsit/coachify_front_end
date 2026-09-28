import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Deep-link to a row: `?<param>=<id>` (e.g. /assessments?assessment=52 from
 * the dashboard). Returns the id; once `ready`, scrolls the element with id
 * `${rowIdPrefix}${id}` into view. Pair with a highlight class on that row.
 */
export function useFocusRow(param: string, rowIdPrefix: string, ready: boolean): number | null {
  const [searchParams] = useSearchParams()
  const raw = Number(searchParams.get(param))
  const focusId = Number.isInteger(raw) && raw > 0 ? raw : null

  useEffect(() => {
    if (!ready || focusId === null) return
    // next frame: the table has rendered
    const t = window.setTimeout(() => {
      document.getElementById(`${rowIdPrefix}${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return () => window.clearTimeout(t)
  }, [ready, focusId, rowIdPrefix])

  return focusId
}

/** Highlight style for the focused row (works with Bootstrap tables). */
export const FOCUS_ROW_STYLE = {
  boxShadow: 'inset 4px 0 0 var(--primary-600, #487fff)',
  backgroundColor: 'rgba(72, 127, 255, 0.08)',
} as const
