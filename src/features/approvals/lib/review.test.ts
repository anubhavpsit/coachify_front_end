import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewActivity } from '../services/activityApprovalsService'
import { bulkMessage, groupByDate, matchesSearch, quickFilterDates } from './review'

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-01T10:00:00') }))
afterEach(() => vi.useRealTimers())

const act = (over: Partial<ReviewActivity>): ReviewActivity => ({ id: 1, activity_date: '2026-10-01', ...over })

describe('quickFilterDates (legacy port)', () => {
  it('maps each quick filter to the same params as before', () => {
    expect(quickFilterDates('today', '')).toEqual({ date: '2026-10-01' })
    expect(quickFilterDates('3d', '')).toEqual({ date_from: '2026-09-29', date_to: '2026-10-01' })
    expect(quickFilterDates('30d', '')).toEqual({ date_from: '2026-09-02', date_to: '2026-10-01' })
    expect(quickFilterDates('all', '')).toEqual({})
    expect(quickFilterDates('custom', '2026-08-15')).toEqual({ date: '2026-08-15' })
    expect(quickFilterDates('custom', '')).toEqual({})
  })
})

describe('list helpers', () => {
  it('groups consecutive days, newest first as returned', () => {
    const g = groupByDate([act({ id: 1, activity_date: '2026-10-01T00:00:00Z' }), act({ id: 2 }), act({ id: 3, activity_date: '2026-09-30' })])
    expect(g.map((x) => [x.date, x.items.map((i) => i.id)])).toEqual([
      ['2026-10-01', [1, 2]],
      ['2026-09-30', [3]],
    ])
  })

  it('searches student, teacher, subject, topic and notes', () => {
    const a = act({ student: { id: 1, name: 'Asha' }, teacher: { id: 2, name: 'Meera' }, subject: { id: 5, subject: 'Maths' }, topic_model: { id: 7, name: 'Fractions' } })
    expect(['asha', 'MEERA', 'math', 'fract'].every((q) => matchesSearch(a, q))).toBe(true)
    expect(matchesSearch(a, 'science')).toBe(false)
    expect(matchesSearch(a, '  ')).toBe(true)
  })

  it('keeps the legacy bulk wording', () => {
    expect(bulkMessage({ approved: 3, attachments_approved: 1, students_notified: 2 }, true)).toBe('Approved 3 activities and 1 attachment; 2 students notified.')
    expect(bulkMessage({ approved: 1, students_notified: 1, awaiting_teacher: 2 }, false)).toBe('Approved 1 activity; 1 student notified. 2 were skipped (waiting on the teacher).')
  })
})
