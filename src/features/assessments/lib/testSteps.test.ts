import { describe, expect, it } from 'vitest'
import type { Assessment, AssessmentProgress } from '../services/assessmentsService'
import { nextStep, testSteps } from './testSteps'

const progress = (over: Partial<AssessmentProgress> = {}): AssessmentProgress => ({
  total: 0, upcoming: 0, today: 0, awaiting_results: 0, result_out: 0, absent: 0, cancelled: 0, next_date: null, oldest_pending_date: null, stage: 'not_assigned', ...over,
})
const test_ = (over: Partial<Assessment> = {}): Assessment => ({ id: 1, title: 'T', subject_id: 1, total_marks: 20, status: 'scheduled', is_admin_approved: true, progress: progress(), ...over })
const byKey = (a: Assessment, admin = false) => Object.fromEntries(testSteps(a, admin).map((s) => [s.key, s]))

describe('testSteps', () => {
  it('a new test: next is adding students, paper optional, results later', () => {
    const steps = testSteps(test_(), false)
    expect(nextStep(steps)).toBe('students')
    expect(byKey(test_()).paper.state).toBe('optional')
    expect(byKey(test_()).results.state).toBe('later')
  })

  it('unapproved: admin must act, a teacher only waits and moves on', () => {
    const a = test_({ is_admin_approved: false })
    expect(nextStep(testSteps(a, true))).toBe('details')
    expect(byKey(a).details.state).toBe('waiting')
    expect(byKey(a).details.status).toContain('Waiting for admin')
    expect(nextStep(testSteps(a, false))).toBe('students')
  })

  it('a built paper that nobody approved needs action', () => {
    const a = test_({ paper_questions_count: 3, progress: progress({ total: 1, upcoming: 1, next_date: '2026-11-20', stage: 'upcoming' }) })
    expect(nextStep(testSteps(a, false))).toBe('paper')
    expect(byKey(a).paper.status).toBe("3 questions, still a draft. Students won't see it until you mark it ready.")
  })

  it('an approved or released paper is done', () => {
    expect(byKey(test_({ paper_questions_count: 3, question_paper_approved_at: '2026-10-01' })).paper.state).toBe('done')
    expect(byKey(test_({ paper_questions_count: 3, question_paper_released_at: '2026-10-01' })).paper.status).toBe('Students can see it now.')
  })

  it('results follow the stage of the test', () => {
    const upcoming = test_({ progress: progress({ total: 2, upcoming: 2, next_date: '2026-11-20', stage: 'upcoming' }) })
    expect(byKey(upcoming).results).toMatchObject({ state: 'later', status: 'After the test on 20/11/2026.' })
    expect(nextStep(testSteps(upcoming, false))).toBeNull()

    const needs = test_({ progress: progress({ total: 2, awaiting_results: 1, result_out: 1, oldest_pending_date: '2026-10-14', stage: 'needs_results' }) })
    expect(byKey(needs).results).toMatchObject({ state: 'action', status: '1 student still to enter, since 14/10/2026.' })
    expect(byKey(test_({ progress: progress({ total: 2, today: 2, stage: 'today' }) })).results.state).toBe('action')

    const done = test_({ progress: progress({ total: 3, result_out: 2, absent: 1, stage: 'done' }) })
    expect(byKey(done).results).toMatchObject({ state: 'done', status: '2 results saved, 1 absent.' })
  })

  it('cancelled students do not count as assigned', () => {
    expect(byKey(test_({ progress: progress({ total: 2, cancelled: 2, stage: 'done' }) })).students.state).toBe('action')
  })
})
