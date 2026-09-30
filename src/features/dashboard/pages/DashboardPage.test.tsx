import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from './DashboardPage'

// Every legacy widget becomes a marker so we can assert exactly which render.
vi.mock('@/components/ActivityLogCard', () => ({ default: () => <i data-widget="ActivityLogCard" /> }))
vi.mock('../widgets/BirthdayCard', () => ({ default: () => <i data-widget="BirthdayCard" /> }))
vi.mock('../widgets/EnquiriesFollowUpCard', () => ({ default: () => <i data-widget="EnquiriesFollowUpCard" /> }))
vi.mock('../widgets/GhostStudentsCard', () => ({ default: () => <i data-widget="GhostStudentsCard" /> }))
vi.mock('../widgets/LowAttendanceCard', () => ({ default: () => <i data-widget="LowAttendanceCard" /> }))
vi.mock('@/components/PendingActionsCard', () => ({ default: () => <i data-widget="PendingActionsCard" /> }))
vi.mock('@/components/PendingFeesCard', () => ({ default: () => <i data-widget="PendingFeesCard" /> }))
vi.mock('@/components/TeacherActivityGapsCard', () => ({ default: () => <i data-widget="TeacherActivityGapsCard" /> }))
vi.mock('../widgets/TodayBirthdayCard', () => ({ default: () => <i data-widget="TodayBirthdayCard" /> }))
vi.mock('../widgets/UnassignedStudentsCard', () => ({ default: () => <i data-widget="UnassignedStudentsCard" /> }))
vi.mock('@/components/notices/NoticeBoardCard', () => ({ default: () => <i data-widget="NoticeBoardCard" /> }))
vi.mock('@/components/overview/SmartDashboard', () => ({ default: ({ role }: { role: string }) => <i data-widget={`SmartDashboard:${role}`} /> }))

const statsSpy = vi.fn()
const topSpy = vi.fn()
vi.mock('../services/dashboardService', () => ({
  fetchDashboardStats: (...a: unknown[]) => {
    statsSpy(...a)
    return Promise.resolve({ success: true, data: { role: 'x', total_students: 1, total_teachers: 2, total_activities: 3, total_earnings: 4, total_expenses: 5, home_not_done_count: 6, total_fees_paid: 7 } })
  },
  fetchTopStudents: (...a: unknown[]) => {
    topSpy(...a)
    return Promise.resolve({ success: true, data: [] })
  },
}))

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 't')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 1, permissions }))
}

async function widgets() {
  await screen.findByRole('heading', { name: 'Dashboard' })
  await new Promise((r) => setTimeout(r, 0))
  return Array.from(document.querySelectorAll('[data-widget]')).map((e) => e.getAttribute('data-widget')).sort()
}

const ALL_ADMIN = ['ActivityLogCard', 'BirthdayCard', 'EnquiriesFollowUpCard', 'GhostStudentsCard', 'LowAttendanceCard', 'NoticeBoardCard', 'PendingActionsCard', 'PendingFeesCard', 'TeacherActivityGapsCard', 'TodayBirthdayCard', 'UnassignedStudentsCard']

beforeEach(() => {
  statsSpy.mockClear()
  topSpy.mockClear()
})

describe('DashboardPage permission gates (legacy parity)', () => {
  it('coaching_admin sees every admin widget and all 5 stat cards', async () => {
    login('coaching_admin')
    render(<DashboardPage />)
    expect(await widgets()).toEqual(ALL_ADMIN)
    for (const label of ['Total Students', 'Total Teachers', 'Total Activities', 'Total Earnings', 'Total Expenses']) {
      expect(await screen.findByText(label)).toBeTruthy()
    }
    expect(await screen.findByText('Top Performing Students')).toBeTruthy()
  })

  it('super_admin: stats fetched (admin bypass), no admin/staff block (role check), activity log via can()', async () => {
    login('super_admin')
    render(<DashboardPage />)
    expect(await widgets()).toEqual(['ActivityLogCard'])
    expect(statsSpy).toHaveBeenCalled()
    expect(screen.queryByText('Total Students')).toBeNull()
  })

  it('staff with no permissions: notice board only, no stats request', async () => {
    login('staff')
    render(<DashboardPage />)
    expect(await widgets()).toEqual(['NoticeBoardCard'])
    expect(statsSpy).not.toHaveBeenCalled()
    expect(topSpy).not.toHaveBeenCalled()
  })

  const single: Array<[string, string[]]> = [
    ['dashboard.pending_actions', ['PendingActionsCard']],
    ['fees.view', ['PendingFeesCard']],
    ['dashboard.activity_gaps', ['TeacherActivityGapsCard']],
    ['dashboard.birthdays', ['BirthdayCard', 'TodayBirthdayCard']],
    ['attendance.view', ['LowAttendanceCard']],
    ['enquiries.view', ['EnquiriesFollowUpCard']],
    ['dashboard.ghost_students', ['GhostStudentsCard']],
    ['dashboard.unassigned_students', ['UnassignedStudentsCard']],
    ['activity_logs.view', ['ActivityLogCard']],
  ]
  for (const [perm, expected] of single) {
    it(`staff + ${perm}`, async () => {
      login('staff', [perm])
      render(<DashboardPage />)
      expect(await widgets()).toEqual(['NoticeBoardCard', ...expected].sort())
    })
  }

  it('staff + one stat key sees only that card', async () => {
    login('staff', ['dashboard.stats.earnings'])
    render(<DashboardPage />)
    expect(await screen.findByText('Total Earnings')).toBeTruthy()
    expect(screen.queryByText('Total Students')).toBeNull()
    expect(screen.queryByText('Total Expenses')).toBeNull()
  })

  it('staff + dashboard.top_students fetches and shows the table', async () => {
    login('staff', ['dashboard.top_students'])
    render(<DashboardPage />)
    expect(await screen.findByText('Top Performing Students')).toBeTruthy()
    expect(topSpy).toHaveBeenCalled()
  })

  it('teacher: pending actions + today birthdays (role-only) + smart dashboard', async () => {
    login('teacher', ['dashboard.view'])
    render(<DashboardPage />)
    expect(await widgets()).toEqual(['PendingActionsCard', 'SmartDashboard:teacher', 'TodayBirthdayCard'])
    expect(await screen.findByText('My Students')).toBeTruthy()
    expect(screen.queryByText('Top Performing Students')).toBeNull()
  })

  it('student: smart dashboard + 4 stat cards, nothing else', async () => {
    login('student', ['dashboard.view'])
    render(<DashboardPage />)
    expect(await widgets()).toEqual(['SmartDashboard:student'])
    expect(await screen.findByText('Fees Paid')).toBeTruthy()
  })

  it('student + activity_logs.view also gets the activity log', async () => {
    login('student', ['dashboard.view', 'activity_logs.view'])
    render(<DashboardPage />)
    expect(await widgets()).toEqual(['ActivityLogCard', 'SmartDashboard:student'])
  })
})
