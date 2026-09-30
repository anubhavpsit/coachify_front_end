export type AssessmentHistoryItem = {
  id: number
  attempted_at?: string | null
  result?: { percentage?: number | string } | null
}
export type PerformanceSummary = {
  totalAssessments: number
  completedAssessments: number
  averagePercentage: number | null
  lastPercentage: number | null
}

/** Port of the legacy ProfilePage calculation (unit-tested). */
export function summarizePerformance(history: AssessmentHistoryItem[]): PerformanceSummary {
  const completed = history.filter((i) => {
    const p = i.result?.percentage
    return p !== undefined && p !== null && !Number.isNaN(Number(p))
  })
  const n = completed.length
  const averagePercentage =
    n > 0
      ? Number(
          (
            completed.reduce((sum, i) => {
              const v = Number(i.result?.percentage ?? 0)
              return sum + (Number.isNaN(v) ? 0 : v)
            }, 0) / n
          ).toFixed(2),
        )
      : null
  let lastPercentage: number | null = null
  if (n > 0) {
    const latest = [...completed].sort((a, b) => (b.attempted_at ? new Date(b.attempted_at).getTime() : 0) - (a.attempted_at ? new Date(a.attempted_at).getTime() : 0))[0]
    const v = Number(latest.result?.percentage ?? 0)
    lastPercentage = Number.isNaN(v) ? null : Number(v.toFixed(2))
  }
  return {
    totalAssessments: history.length,
    completedAssessments: n,
    averagePercentage,
    lastPercentage,
  }
}
