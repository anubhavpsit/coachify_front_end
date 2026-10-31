import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminAssessmentHero, StudentAssessmentHero, TeacherAssessmentHero } from './AssessmentHeroCard'
import type { AdminAssessmentsOverview, StudentOverview, TeacherOverview } from './overviewApi'

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

const student = (over: Partial<StudentOverview> = {}): StudentOverview => ({
  upcoming_assessments: [
    { assignment_id: 2, assessment_id: 20, title: 'Light', subject: 'Science', scheduled_date: '2026-10-30', days_until: 3, last_subject_score: null },
    { assignment_id: 1, assessment_id: 10, title: 'Unit Test 1', subject: 'Maths', scheduled_date: '2026-10-29', days_until: 2, last_subject_score: 64 },
  ],
  homework_pending: { count: 0, items: [] },
  recent_results: [
    { assessment_id: 5, title: 'Fractions', subject: 'Maths', marks_obtained: 18, total_marks: 25, percentage: 72, graded_at: null, previous_percentage: 64, trend: 'up' },
  ],
  attendance: { month: '2026-10', present: 0, absent: 0, leave: 0, percentage: null, low: false },
  new_content: [],
  ...over,
})

const teacher = (over: Partial<TeacherOverview> = {}): TeacherOverview => ({
  upcoming_assessments: [],
  papers_to_approve: [],
  results_to_enter: [],
  today_activity: { date: '2026-10-27', is_holiday: false, total_students: 0, logged_count: 0, missing_count: 0, missing: [] },
  students_attention: [],
  ...over,
})

describe('Student — your next test', () => {
  it('shows the soonest test as a countdown and the last result with its trend', () => {
    wrap(<StudentAssessmentHero data={student()} />)
    expect(screen.getByText('Your next test')).toBeTruthy()
    expect(screen.getByText('Maths — Unit Test 1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('Your last Maths score:').textContent).toContain('64%')
    expect(screen.getByText(/\+8% since your last Maths test/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Unit Test 1/ }).getAttribute('href')).toBe('/students/assessments?assessment=10')
  })

  it('a test today says so', () => {
    const today = student({ upcoming_assessments: [{ assignment_id: 1, assessment_id: 10, title: 'Unit Test 1', subject: 'Maths', scheduled_date: '2026-10-27', days_until: 0, last_subject_score: null }] })
    wrap(<StudentAssessmentHero data={today} />)
    expect(screen.getByText('TODAY')).toBeTruthy()
    expect(screen.getByText('Today — all the best! 💪')).toBeTruthy()
  })

  it('nothing coming and no results → no card', () => {
    const { container } = wrap(<StudentAssessmentHero data={student({ upcoming_assessments: [], recent_results: [] })} />)
    expect(container.textContent).toBe('')
  })
})

describe('Teacher — your assessments', () => {
  it('results to enter (one → opens its results), tests today with a paper warning, this week', () => {
    wrap(
      <TeacherAssessmentHero
        data={teacher({
          results_to_enter: [{ assessment_id: 7, title: 'Waves', subject: 'Physics', scheduled_date: '2026-10-25', days_since: 2, pending_count: 3 }],
          upcoming_assessments: [
            { assessment_id: 8, title: 'Optics', subject: 'Physics', scheduled_date: '2026-10-27', days_until: 0, students_count: 10, paper_status: null },
            { assessment_id: 9, title: 'Sound', subject: 'Physics', scheduled_date: '2026-10-30', days_until: 3, students_count: 10, paper_status: 'approved' },
          ],
          papers_to_approve: [{ assessment_id: 8, title: 'Optics', subject: 'Physics', scheduled_date: '2026-10-27', days_until: 0 }],
        })}
      />,
    )
    expect(screen.getByRole('link', { name: /Results to enter/ }).getAttribute('href')).toBe('/assessments?assessment=7&results=1')
    expect(screen.getByText('Waves · 3 students')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Test today/ }).getAttribute('href')).toBe('/assessments?assessment=8')
    expect(screen.getByText('Question paper not ready')).toBeTruthy()
    expect(screen.getByRole('link', { name: /This week/ }).getAttribute('href')).toBe('/assessments?tab=upcoming')
  })

  it('several pending → the Needs results tab; nothing to do → no card', () => {
    const two = [1, 2].map((id) => ({ assessment_id: id, title: `T${id}`, subject: 'S', scheduled_date: '2026-10-20', days_since: 7, pending_count: 2 }))
    const { unmount } = wrap(<TeacherAssessmentHero data={teacher({ results_to_enter: two })} />)
    expect(screen.getByRole('link', { name: /Results to enter/ }).getAttribute('href')).toBe('/assessments?tab=needs_results')
    expect(screen.getByText('4 students waiting')).toBeTruthy()
    unmount()
    const { container } = wrap(<TeacherAssessmentHero data={teacher()} />)
    expect(container.textContent).toBe('')
  })
})

describe('Admin — assessments', () => {
  const admin: AdminAssessmentsOverview = {
    tests_today: 1,
    today_list: [{ assessment_id: 3, title: 'Optics', subject: 'Physics', students_count: 12 }],
    this_week: 2,
    needs_results: 3,
    pending_students: 7,
    awaiting_approval: 0,
    overdue_by_teacher: [
      { teacher_id: 5, name: 'Meera', assessments: 2, students: 5 },
      { teacher_id: 6, name: 'Ravi', assessments: 1, students: 2 },
    ],
    on_time: { on_time: 9, total: 10, percentage: 90 },
  }

  it('tests waiting for approval link to that list', () => {
    wrap(<AdminAssessmentHero data={{ ...admin, awaiting_approval: 3 }} />)
    expect(screen.getByRole('link', { name: /Tests to approve/ }).getAttribute('href')).toBe('/assessments?approval=pending')
    expect(screen.getByText("Students can't see these yet")).toBeTruthy()
  })

  it('a waiting test alone still shows the card', () => {
    wrap(<AdminAssessmentHero data={{ ...admin, needs_results: 0, tests_today: 0, today_list: [], this_week: 0, overdue_by_teacher: [], on_time: { on_time: 0, total: 0, percentage: null }, awaiting_approval: 1 }} />)
    expect(screen.getByRole('link', { name: /Test to approve/ })).toBeTruthy()
  })

  it('on-time rate, results waiting by teacher, today and this week', () => {
    wrap(<AdminAssessmentHero data={admin} />)
    expect(screen.getByText('9 of 10 tests this month')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Need results/ }).getAttribute('href')).toBe('/assessments?tab=needs_results')
    expect(screen.getByText('7 students waiting')).toBeTruthy()
    expect(screen.getByText('Meera · 2')).toBeTruthy()
    expect(screen.getByText('Ravi · 1')).toBeTruthy()
    expect(screen.getByText('Physics — Optics')).toBeTruthy()
  })

  it('all quiet → "All results are in"; nothing at all → no card', () => {
    const { unmount } = wrap(<AdminAssessmentHero data={{ ...admin, needs_results: 0, pending_students: 0, overdue_by_teacher: [] }} />)
    expect(screen.getByText('All results are in')).toBeTruthy()
    unmount()
    const { container } = wrap(
      <AdminAssessmentHero data={{ ...admin, needs_results: 0, tests_today: 0, today_list: [], this_week: 0, overdue_by_teacher: [], on_time: { on_time: 0, total: 0, percentage: null } }} />,
    )
    expect(container.textContent).toBe('')
  })
})
