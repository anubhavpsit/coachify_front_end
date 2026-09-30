import { describe, expect, it } from 'vitest'
import { summarizePerformance } from './performance'

describe('summarizePerformance (legacy parity)', () => {
  it('averages completed results and picks the latest attempt', () => {
    expect(
      summarizePerformance([
        { id: 1, attempted_at: '2026-09-01', result: { percentage: '80' } },
        { id: 2, attempted_at: '2026-09-10', result: { percentage: 65.555 } },
        { id: 3, attempted_at: '2026-09-12', result: null },
      ]),
    ).toEqual({
      totalAssessments: 3,
      completedAssessments: 2,
      averagePercentage: 72.78,
      lastPercentage: 65.56,
    })
  })
  it('handles no results', () => {
    expect(summarizePerformance([])).toEqual({
      totalAssessments: 0,
      completedAssessments: 0,
      averagePercentage: null,
      lastPercentage: null,
    })
  })
})
