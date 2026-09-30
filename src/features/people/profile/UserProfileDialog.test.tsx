import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import axios from 'axios'
import UserProfileDialog from './UserProfileDialog'

const student = { id: 9, name: 'Isha Verma', email: 'isha@x.in', role: 'student', tenant_id: 4, attendance_percentage: 82.5, created_at: '2026-06-01', student_profile: { class: '10', phone: '98765', fee_due_date: '2026-10-05', trial_days: 3 }, teachers: [{ id: 2, name: 'Meera Iyer', email: 'm@x.in' }] }

function login(role: string) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role, tenant_id: 4, permissions: [] }))
}

function mockApi({ feeStatus = 200 }: { feeStatus?: number } = {}) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.endsWith('/users/9')) return Promise.resolve({ data: { success: true, data: student } })
    if (url.endsWith('/fee-summary')) {
      if (feeStatus !== 200) return Promise.reject(Object.assign(new Error('x'), { isAxiosError: true, response: { status: feeStatus } }))
      return Promise.resolve({ data: { success: true, data: { last_paid_at: '2026-09-01', last_paid_amount: 1500, next_due_date: '2026-10-05', is_overdue: false, days_overdue: 0 } } })
    }
    return Promise.resolve({ data: { success: true, data: { items: [] }, items: [] } })
  })
}

beforeEach(() => vi.restoreAllMocks())

const tabNames = () => screen.queryAllByRole('tab').map((t) => t.textContent)

describe('UserProfileDialog gates (legacy parity)', () => {
  it('coaching_admin viewing a student: fees card, admin fields, all tabs', async () => {
    login('coaching_admin')
    const get = mockApi()
    render(<UserProfileDialog show userId={9} onHide={() => {}} canEditImage />)
    expect(await screen.findByText('Isha Verma')).toBeTruthy()
    expect(await screen.findByText(/Last fees paid/)).toBeTruthy()
    expect(screen.getByText('Trial Days')).toBeTruthy()
    expect(tabNames()).toEqual(['Overview', 'Assessments', 'Fees History', 'Insights'])
    expect(screen.getByRole('button', { name: 'Change profile image' })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/users\/9$/), { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } })
  })

  it('teacher viewing a student: assessments + insights only, no fees, no upload', async () => {
    login('teacher')
    const get = mockApi()
    render(<UserProfileDialog show userId={9} onHide={() => {}} canEditImage={false} />)
    expect(await screen.findByText('Isha Verma')).toBeTruthy()
    expect(tabNames()).toEqual(['Overview', 'Assessments', 'Insights'])
    expect(screen.queryByText(/Last fees paid/)).toBeNull()
    expect(screen.queryByText('Trial Days')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Change profile image' })).toBeNull()
    expect(get.mock.calls.some(([u]) => /fee/.test(u as string))).toBe(false)
  })

  it('super_admin (Q7) and staff get the plain overview', async () => {
    for (const role of ['super_admin', 'staff']) {
      login(role)
      mockApi()
      const { unmount } = render(<UserProfileDialog show userId={9} onHide={() => {}} canEditImage={false} />)
      expect(await screen.findByText('Isha Verma')).toBeTruthy()
      expect(tabNames()).toEqual([])
      expect(screen.getByText('Assigned Teachers')).toBeTruthy()
      unmount()
      vi.restoreAllMocks()
    }
  })

  it('fees card hidden when the fee summary is forbidden (403)', async () => {
    login('coaching_admin')
    mockApi({ feeStatus: 403 })
    render(<UserProfileDialog show userId={9} onHide={() => {}} canEditImage />)
    expect(await screen.findByText('Isha Verma')).toBeTruthy()
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('heading', { name: 'Fees' })).toBeNull()
  })
})
