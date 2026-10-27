import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SidebarNav from './SidebarNav'
import { setAssessmentBadgeCount } from '@/lib/assessmentBadge'

function login(role: string) {
  localStorage.setItem('authToken', 't')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 1, permissions: [] }))
}

describe('Assessments menu badge', () => {
  it('teacher: red count on Assessments; disappears at 0', () => {
    login('teacher')
    render(
      <MemoryRouter>
        <SidebarNav layoutId="t" />
      </MemoryRouter>,
    )
    act(() => setAssessmentBadgeCount(3))
    expect(screen.getByLabelText('3 assessments need attention')).toBeTruthy()
    act(() => setAssessmentBadgeCount(0))
    expect(screen.queryByLabelText(/assessments need attention/)).toBeNull()
  })

  it('student: on My Assessments', () => {
    login('student')
    render(
      <MemoryRouter>
        <SidebarNav layoutId="s" />
      </MemoryRouter>,
    )
    act(() => setAssessmentBadgeCount(2))
    const badge = screen.getByLabelText('2 assessments need attention')
    expect(badge.closest('a')?.getAttribute('href')).toBe('/students/assessments')
  })
})
