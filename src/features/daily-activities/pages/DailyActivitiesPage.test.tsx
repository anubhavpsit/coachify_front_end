import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import DailyActivitiesPage from './DailyActivitiesPage'

const auth = { headers: { Authorization: 'Bearer tok' } }

const saved = {
  id: 11,
  activity_date: '2026-10-01',
  student_id: 3,
  subject_id: 5,
  chapter_id: null,
  topic_id: null,
  notes: 'Algebra basics',
  homework: '',
  homework_status: 'not_done',
  is_admin_approved: false,
  admin_feedback: 'Please add the homework.',
  attachments: [{ id: 70, original_name: 'board.jpg', path: 'p/board.jpg', file_type: 'image' }],
  student: { id: 3, name: 'Asha' },
  subject: { id: 5, subject: 'Maths' },
}

function signIn(role = 'teacher') {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'T', email: 't@x', role, tenant_id: 4, permissions: [] }))
}

function mockGets(todays: unknown[] = [saved]) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const data = (d: unknown) => Promise.resolve({ data: { success: true, data: d } })
    if (url.endsWith('/teachers/students'))
      return data([
        { id: 3, name: 'Asha' },
        { id: 4, name: 'Ravi' },
      ])
    if (url.endsWith('/classes/4')) return data([{ id: 1, name: 'Class 9' }])
    if (url.endsWith('/subjects/4')) return data([{ id: 5, subject: 'Maths' }])
    if (url.endsWith('/students/3/subjects'))
      return data([
        { id: 5, subject: 'Maths' },
        { id: 6, subject: 'Science' },
      ])
    if (url.endsWith('/students/4/subjects')) return data([{ id: 5, subject: 'Maths' }])
    if (url.endsWith('/teacher/daily-activities')) return data([])
    if (url.endsWith('/daily-activities')) return data(todays)
    return data([])
  })
}

const renderPage = (url = '/teachers/daily-activities') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <DailyActivitiesPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-01T10:00:00') })
})
afterEach(() => vi.useRealTimers())

describe('DailyActivitiesPage — individual students', () => {
  it("loads today's saved entries with the legacy request and shows the admin's note", async () => {
    signIn()
    const get = mockGets()
    renderPage()
    expect(await screen.findByDisplayValue('Algebra basics')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/daily-activities$/), auth)
    expect(screen.getByText('Please add the homework.')).toBeTruthy()
    expect(screen.getByText('Sent back')).toBeTruthy()
    // Attachment delete stays coaching_admin-only.
    expect(screen.queryByRole('button', { name: 'Delete board.jpg' })).toBeNull()
  })

  it('blocks saving an incomplete entry and explains why', async () => {
    signIn()
    mockGets([])
    const post = vi.spyOn(axios, 'post')
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Save activity' }))
    expect(await screen.findByText('Select a student.')).toBeTruthy()
    expect(screen.getByText('Add a topic or a short note about what you taught.')).toBeTruthy()
    expect(screen.getByText('Please fix the highlighted entry before saving.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it('auto-picks a single subject and posts the legacy body', async () => {
    signIn()
    mockGets([])
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: [] } })
    renderPage()
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: /Student/ }), 'Ravi')
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Maths' }).getAttribute('aria-checked')).toBe('true'))
    await userEvent.type(screen.getByRole('textbox', { name: /Class notes/ }), 'Linear equations')
    await userEvent.click(screen.getByRole('button', { name: 'Save activity' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toMatch(/\/daily-activities$/)
    expect(post.mock.calls[0][1]).toEqual({
      activities: [
        {
          id: null,
          student_id: 4,
          subject_id: 5,
          chapter_number: null,
          chapter_id: null,
          topic_id: null,
          notes: 'Linear equations',
          homework: null,
          homework_status: 'not_done',
          activity_date: '2026-10-01',
        },
      ],
    })
    expect(post.mock.calls[0][2]).toEqual(auth)
  })

  it('flags the same student + subject twice', async () => {
    signIn()
    mockGets()
    const post = vi.spyOn(axios, 'post')
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Copy entry 1 for another student' }))
    await userEvent.selectOptions(screen.getAllByRole('combobox', { name: /Student/ })[1], 'Asha')
    // The copy keeps the subject (Maths), so this is now a duplicate of entry 1.
    await userEvent.click(screen.getByRole('button', { name: 'Save 2 activities' }))
    expect(await screen.findByText('Entry 1 already covers this student and subject for this day.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it("switching to yesterday loads that day's entries (not today's)", async () => {
    signIn()
    const get = mockGets()
    renderPage()
    await screen.findByDisplayValue('Algebra basics')
    await userEvent.click(screen.getByRole('button', { name: 'Yesterday' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/teacher\/daily-activities$/), { ...auth, params: { date: '2026-09-30' } }))
    await waitFor(() => expect(screen.queryByDisplayValue('Algebra basics')).toBeNull())
  })

  it('shows the attachment delete button to coaching admins', async () => {
    signIn('coaching_admin')
    mockGets()
    renderPage()
    expect(await screen.findByRole('button', { name: 'Delete board.jpg' })).toBeTruthy()
  })
})

describe('DailyActivitiesPage — whole class', () => {
  it('sends the date with attachments (legacy dropped it)', async () => {
    signIn()
    mockGets([])
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, message: 'Daily activity saved/updated for 2 students.' } })
    const success = vi.spyOn(toast, 'success')
    renderPage('/teachers/daily-activities?mode=batch')
    const panel = await screen.findByRole('tabpanel', { name: /Whole class/ })
    await userEvent.click(screen.getByRole('button', { name: 'Yesterday' }))
    await userEvent.selectOptions(within(panel).getByRole('combobox', { name: /Class/ }), 'Class 9')
    await userEvent.selectOptions(within(panel).getByRole('combobox', { name: /Subject/ }), 'Maths')
    await userEvent.type(within(panel).getByRole('textbox', { name: /Class notes/ }), 'Revision')
    const file = new File(['img'], 'notes.png', { type: 'image/png' })
    await userEvent.upload(panel.querySelector('input[type=file]') as HTMLInputElement, file)
    await userEvent.click(within(panel).getByRole('button', { name: 'Save for whole class' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    const fd = post.mock.calls[0][1] as FormData
    expect(fd.get('class_id')).toBe('1')
    expect(fd.get('subject_id')).toBe('5')
    expect(fd.get('notes')).toBe('Revision')
    expect(fd.get('activity_date')).toBe('2026-09-30')
    expect((fd.get('attachments[]') as File).name).toBe('notes.png')
    await waitFor(() => expect(success).toHaveBeenCalledWith('Daily activity saved/updated for 2 students.'))
  })
})

describe('DailyActivitiesPage — history', () => {
  it('updates homework status with the legacy PATCH', async () => {
    signIn()
    mockGets()
    vi.mocked(axios.get).mockImplementation((url: string) => Promise.resolve({ data: { success: true, data: url.endsWith('/teacher/daily-activities') ? [{ ...saved, remarks: '' }] : [] } }))
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: { success: true } })
    renderPage('/teachers/daily-activities?mode=history')
    const panel = await screen.findByRole('tabpanel', { name: /History/ })
    await userEvent.selectOptions(await within(panel).findByRole('combobox', { name: /Homework status/ }), 'done')
    expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/daily-activities\/11\/status$/), { homework_status: 'done' }, auth)
  })
})
