import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import axios from 'axios'
import BirthdayCard from './BirthdayCard'
import EnquiriesFollowUpCard from './EnquiriesFollowUpCard'
import LowAttendanceCard from './LowAttendanceCard'
import TodayBirthdayCard from './TodayBirthdayCard'

const ok = (data: unknown, extra: object = {}) => ({ data: { success: true, data, ...extra } })

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
})

describe('dashboard widgets keep their legacy requests', () => {
  it('BirthdayCard', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue(ok([{ id: 1, name: 'Asha Rao', role: 'student', dob: '', status: 'active' }]))
    render(<BirthdayCard />)
    expect(await screen.findByText('Asha Rao')).toBeTruthy()
    expect(screen.getByText('active')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/dashboard\/birthdays\/current-month$/), {
      headers: { Authorization: 'Bearer tok', Accept: 'application/json' },
    })
  })

  it('TodayBirthdayCard empty state', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue(ok([]))
    render(<TodayBirthdayCard />)
    expect(await screen.findByText('No birthdays today 🎂')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/dashboard\/birthday\/today$/), expect.anything())
  })

  it('TodayBirthdayCard shows carousel controls only for 2+ people', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue(ok([
      { id: 1, name: 'A One', role: 'teacher', dob: '' },
      { id: 2, name: 'B Two', role: 'student', dob: '', status: 'inactive' },
    ]))
    render(<TodayBirthdayCard />)
    expect(await screen.findByText('A One')).toBeTruthy()
    expect(screen.getByLabelText('Next birthday')).toBeTruthy()
    expect(screen.getByText('1/2')).toBeTruthy()
  })

  it('LowAttendanceCard (no Accept header, as before) + error state', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce(ok([{ id: 1, name: 'Ravi', role: 'teacher', attendance_percentage: 42 }]))
    render(<LowAttendanceCard />)
    expect(await screen.findByText('42%')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/attendance\/low-percentage$/), { headers: { Authorization: 'Bearer tok' } })
  })

  it('LowAttendanceCard failure is shown with retry (legacy threw unhandled)', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('x'))
    render(<LowAttendanceCard />)
    expect(await screen.findByText('Unable to load attendance.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('EnquiriesFollowUpCard shows frequency + entries', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue(
      ok([{ id: 5, enquiry_type: 'teacher', name: 'Neha', contact_number: '9876543210', status: 'active', created_at: '' }], { meta: { follow_up_frequency_days: 3 } }),
    )
    render(<EnquiriesFollowUpCard />)
    expect(await screen.findByText('Neha')).toBeTruthy()
    expect(screen.getByText('Teacher Enquiry')).toBeTruthy()
    expect(screen.getByText('Every 3 days')).toBeTruthy()
  })

  it('EnquiriesFollowUpCard without token keeps the legacy message', async () => {
    localStorage.removeItem('authToken')
    render(<EnquiriesFollowUpCard />)
    expect(await screen.findByText('You are not authenticated.')).toBeTruthy()
  })
})
