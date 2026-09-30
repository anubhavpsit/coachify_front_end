import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import CorrectionsAdminPage from './CorrectionsAdminPage'

const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }
const item = (id: number, name: string) => ({ id, attendance_date: '2026-09-02', current_status: 'absent', requested_status: 'present', reason: 'I was there', status: 'pending', user: { id, name, role: 'student' } })

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
})

describe('CorrectionsAdminPage', () => {
  it('filters on the server and keeps comments per row (legacy shared one)', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { data: [item(1, 'Isha'), item(2, 'Ravi')] } })
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: {} })
    render(<CorrectionsAdminPage />)
    expect(await screen.findByText('Isha')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/attendance-corrections\?status=pending$/), opts)
    await userEvent.type(screen.getByLabelText('Comment for Isha'), 'ok, verified')
    expect((screen.getByLabelText('Comment for Ravi') as HTMLInputElement).value).toBe('')
    await userEvent.click(screen.getAllByRole('button', { name: /Approve/ })[0])
    await waitFor(() => expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/attendance-corrections\/1$/), { approved: true, admin_comment: 'ok, verified' }, opts))
    await userEvent.click(screen.getByRole('tab', { name: 'All' }))
    await waitFor(() => expect(get).toHaveBeenLastCalledWith(expect.stringMatching(/\/admin\/attendance-corrections\?$/), opts))
  })
})
