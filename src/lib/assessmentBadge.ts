/**
 * Assessments menu badge: results waiting to be entered (teacher / admin /
 * permitted staff) or tests in the next 2 days (student). The count rides on
 * the bell's existing unread-count poll (`assessments_badge`), so it costs no
 * extra request; saving results nudges it to refresh straight away.
 */
type Listener = (count: number) => void

let count = 0
const listeners = new Set<Listener>()

export function getAssessmentBadgeCount() {
  return count
}

export function setAssessmentBadgeCount(next: number | undefined | null) {
  if (typeof next !== 'number' || next === count) return
  count = Math.max(0, next)
  listeners.forEach((l) => l(count))
}

export function subscribeAssessmentBadge(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
