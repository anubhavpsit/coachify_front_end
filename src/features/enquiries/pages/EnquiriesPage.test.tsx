import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import EnquiriesPage from './EnquiriesPage'

const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }
const enquiry = { id: 4, tenant_id: 4, enquiry_type: 'student', name: 'Neha Kapoor', contact_number: '9876543210', email: null, status: 'active', last_communication_at: null, created_at: '2026-09-20T05:00:00Z' }

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role, tenant_id: 4, permissions }))
}

beforeEach(() => vi.restoreAllMocks())

describe('EnquiriesPage', () => {
  it('Q1 preserved: staff with enquiries.manage and super_admin see the message and nothing is fetched', async () => {
    for (const role of ['staff', 'super_admin']) {
      login(role, ['enquiries.manage'])
      const get = vi.spyOn(axios, 'get')
      const { unmount } = render(<EnquiriesPage />)
      expect(await screen.findByText('You are not authorized to view this page.')).toBeTruthy()
      expect(get).not.toHaveBeenCalled()
      unmount()
      vi.restoreAllMocks()
    }
  })

  it('admin: lists, filters by status on the server, creates with the legacy body', async () => {
    login('coaching_admin')
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: [enquiry] } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { ...enquiry, id: 5, name: 'Rahul' } } })
    render(<EnquiriesPage />)
    expect(await screen.findByRole('cell', { name: 'Neha Kapoor' })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/enquiries$/), opts)
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'inactive')
    await waitFor(() => expect(get).toHaveBeenLastCalledWith(expect.stringMatching(/\/enquiries\?status=inactive$/), opts))

    await userEvent.type(screen.getByLabelText(/^Name/), ' Rahul ')
    await userEvent.type(screen.getByLabelText(/^Email/), 'bad')
    await userEvent.click(screen.getByRole('button', { name: 'Save Enquiry' }))
    expect(await screen.findByText('Contact number is required.')).toBeTruthy()
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy()
    await userEvent.clear(screen.getByLabelText(/^Email/))
    await userEvent.type(screen.getByLabelText(/^Contact Number/), '98765 43210')
    await userEvent.click(screen.getByRole('tab', { name: 'Teacher' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Enquiry' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ enquiry_type: 'teacher', name: 'Rahul', contact_number: '98765 43210', email: null, school_name: null, class_grade: null, subjects_interested: null, description: null })
  })

  it('toggle status PUTs { status } and detail dialog logs a communication', async () => {
    login('coaching_admin')
    vi.spyOn(axios, 'get').mockImplementation((url: string) =>
      Promise.resolve(/\/enquiries\/4$/.test(url) ? { data: { success: true, data: { ...enquiry, communications: [] } } } : { data: { success: true, data: [enquiry] } }),
    )
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true, data: { ...enquiry, status: 'inactive' } } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { enquiry: { ...enquiry, last_communication_at: '2026-09-30T06:00:00Z', communications: [{ id: 1, channel: 'whatsapp', notes: 'Called back', communicated_at: '2026-09-30T06:00:00Z', created_at: '' }] } } } })
    render(<EnquiriesPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Mark Neha Kapoor inactive' }))
    expect(put).toHaveBeenCalledWith(expect.stringMatching(/\/enquiries\/4$/), { status: 'inactive' }, opts)
    expect(await screen.findByRole('button', { name: 'Mark Neha Kapoor active' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'View Neha Kapoor' }))
    const d = await screen.findByRole('dialog')
    await userEvent.selectOptions(within(d).getByLabelText(/^Channel/), 'whatsapp')
    await userEvent.type(within(d).getByLabelText(/^Notes/), 'Called back')
    await userEvent.click(within(d).getByRole('button', { name: 'Save Communication' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ channel: 'whatsapp', notes: 'Called back', communicated_at: undefined })
    expect(await within(d).findByText('Called back')).toBeTruthy()
  })
})
