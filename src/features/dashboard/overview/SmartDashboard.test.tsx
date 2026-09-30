import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import SmartDashboard from './SmartDashboard'

vi.mock('@/components/notices/NoticeBoardCard', () => ({ default: () => <i data-testid="notices" /> }))

const student = {
  role: 'student',
  today: '2026-09-30',
  alerts: [{ key: 'a1', severity: 'high', icon: 'attendance', title: 'Attendance is low', message: '68% this month', target: 'attendance' }],
  student: {
    upcoming_assessments: [{ assignment_id: 1, assessment_id: 11, title: 'Algebra Test', subject: 'Maths', scheduled_date: '2026-10-01', days_until: 1, last_subject_score: 35 }],
    homework_pending: { count: 0, items: [] },
    recent_results: [{ assessment_id: 3, title: 'Physics Quiz', subject: 'Physics', marks_obtained: 18, total_marks: 20, percentage: 90, graded_at: '2026-09-20', previous_percentage: 70, trend: 'up' }],
    attendance: { month: 'September', present: 17, absent: 8, leave: 0, percentage: 68, low: true },
    new_content: [],
  },
}

function renderAt(role: 'student' | 'teacher') {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<SmartDashboard role={role} />} />
        <Route path="/my-attendance" element={<p>my attendance page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
})

describe('SmartDashboard', () => {
  it('student: widgets, attendance ring, alert navigates to the same target', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: student } })
    renderAt('student')
    expect(await screen.findByText('Algebra Test')).toBeTruthy()
    expect(screen.getByText('No pending homework. 🎉')).toBeTruthy()
    expect(screen.getByRole('img', { name: '68% present this month' })).toBeTruthy()
    expect(screen.getByLabelText('Improved')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Algebra Test/ }).getAttribute('href')).toBe('/students/assessments?assessment=11')
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/dashboard\/overview$/), { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } })
    await userEvent.click(screen.getByRole('button', { name: /Attendance is low/ }))
    expect(await screen.findByText('my attendance page')).toBeTruthy()
  })

  it('survives a response without alerts (legacy crashed)', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { ...student, alerts: undefined } } })
    renderAt('student')
    expect(await screen.findByText('Algebra Test')).toBeTruthy()
  })

  it('shows a retryable error and still renders the notice board', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('x'))
    renderAt('teacher')
    expect(await screen.findByText('Unable to load your dashboard insights.')).toBeTruthy()
    expect(screen.getByTestId('notices')).toBeTruthy()
  })
})
