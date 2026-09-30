import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import InsightsPage from './InsightsPage'

const headers = { Authorization: 'Bearer tok', Accept: 'application/json' }
const subjects = {
  success: true,
  data: { items: [{ subject_id: 5, subject: 'Physics', activity_count: 3, days_count: 2, share: 0.75, series: [], dates: [] }, { subject_id: 6, subject: 'Maths', activity_count: 1, days_count: 1, share: 0.25, series: [], dates: [] }], focus: { notes: ['Maths is under-covered.'] } },
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
})

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) =>
    Promise.resolve({ data: url.endsWith('/subjects') ? subjects : { success: true, data: { items: [{ chapter: 'Optics', activity_count: 2 }] } } }),
  )
}

describe('InsightsPage', () => {
  it('loads 7 days by default with the legacy params and shows shares + notes', async () => {
    const get = mockGets()
    render(<InsightsPage />)
    expect(await screen.findByText('Physics')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/insights\/activities\/subjects$/), { headers, params: { window_days: 7 } })
    expect(screen.getByText('75%')).toBeTruthy()
    expect(screen.getByText('Maths is under-covered.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Insights (last 7 days)' })).toBeTruthy()
  })

  it('"All" sends all=true; chapters reload for the new window', async () => {
    const get = mockGets()
    render(<InsightsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'View chapters for Physics' }))
    expect(await screen.findByText('Optics')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/chapters$/), { headers, params: { window_days: 7, subject_id: 5 } })
    await userEvent.click(screen.getByRole('tab', { name: 'All' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/subjects$/), { headers, params: { all: 'true' } }))
    await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/chapters$/), { headers, params: { all: 'true', subject_id: 5 } }))
  })

  it('shows the empty message for an empty window', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { items: [], focus: { notes: [] } } } })
    render(<InsightsPage />)
    expect(await screen.findByText('No activity in this window.')).toBeTruthy()
  })
})
