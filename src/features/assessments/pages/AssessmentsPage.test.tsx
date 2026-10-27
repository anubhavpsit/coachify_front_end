import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import AssessmentsPage from './AssessmentsPage'

const auth = { headers: { Authorization: 'Bearer tok' } }
const json = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }
const asm = {
  id: 7,
  title: 'Unit Test 1',
  subject_id: 5,
  class_id: 1,
  total_marks: 50,
  scheduled_date: '2026-10-10',
  status: 'scheduled',
  is_admin_approved: false,
  paper_questions_count: 2,
  subject: { id: 5, subject: 'Maths' },
  class: { id: 1, name: 'Class 9' },
  teacher: { id: 2, name: 'Meera' },
}
const detail = { ...asm, assignments: [{ id: 1, student_id: 3, scheduled_date: '2026-10-10', status: 'upcoming', student: { id: 3, name: 'Asha' } }] }
const paper = {
  assessment_id: 7,
  title: 'Unit Test 1',
  source: 'manual',
  total_marks: 50,
  status: 'pending',
  questions: [{ id: 91, marks: 25, question_html: '<p>What is 2+2?</p>', difficulty: 'easy' }],
}

function signIn(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 4, permissions }))
}

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const ok = (data: unknown, extra = {}) => Promise.resolve({ data: { success: true, data, ...extra } })
    if (url.endsWith('/assessments')) return ok([asm])
    if (url.endsWith('/assessments/7')) return ok(detail)
    if (url.endsWith('/assessments/7/files')) return ok([{ id: 60, type: 'question_paper', path: 'p', original_name: 'paper.pdf', is_admin_approved: true }])
    if (url.endsWith('/assessments/7/question-paper')) return ok(paper)
    if (url.includes('/question-paper/available')) return ok([])
    if (url.endsWith('/subjects/4')) return Promise.resolve({ data: { status: true, data: [{ id: 5, subject: 'Maths' }] } })
    if (url.endsWith('/classes/4')) return ok([{ id: 1, name: 'Class 9' }])
    if (url.endsWith('/students') || url.endsWith('/teachers/students')) return ok([{ id: 3, name: 'Asha', student_profile: { class: 1 } }, { id: 4, name: 'Ravi', student_profile: { class: 2 } }])
    if (url.endsWith('/tenant/auto-assessment')) return ok({ enabled: false })
    return ok([])
  })
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <AssessmentsPage />
    </MemoryRouter>,
  )
const row = async () => (await screen.findByText('Unit Test 1')).closest('tr')!

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('AssessmentsPage — gates (unchanged)', () => {
  it('coaching admin: approval, auto toggle and question paper', async () => {
    signIn('coaching_admin')
    mockGets()
    renderPage()
    const r = await row()
    expect(within(r).getByRole('button', { name: 'Approve' })).toBeTruthy()
    expect(within(r).getByRole('button', { name: 'Question paper for Unit Test 1' })).toBeTruthy()
    expect(screen.getByRole('switch')).toBeTruthy()
  })

  it('teacher: question paper but no approval or auto toggle; own students list', async () => {
    signIn('teacher')
    const get = mockGets()
    renderPage()
    const r = await row()
    expect(within(r).queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(within(r).getByRole('button', { name: 'Question paper for Unit Test 1' })).toBeTruthy()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/teachers\/students$/), auth)
  })

  it('staff with assessments.manage: no approval, no question paper (role-based, Q6)', async () => {
    signIn('staff', ['assessments.manage'])
    mockGets()
    renderPage()
    const r = await row()
    expect(within(r).queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(within(r).queryByRole('button', { name: /Question paper/ })).toBeNull()
  })
})

describe('AssessmentsPage — forms', () => {
  it('create: validates and posts the legacy body', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { ...asm, id: 8, title: 'Weekly quiz' } } })
    renderPage()
    await row()
    await userEvent.click(screen.getByRole('button', { name: 'Create Assessment' }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(within(d).getByRole('button', { name: 'Create' }))
    expect(await within(d).findByText('Title is required.')).toBeTruthy()
    expect(within(d).getByText('Select a subject.')).toBeTruthy()
    expect(within(d).getByText('Enter the total marks.')).toBeTruthy()
    await userEvent.type(within(d).getByRole('textbox', { name: /Title/ }), 'Weekly quiz')
    await userEvent.selectOptions(within(d).getByRole('combobox', { name: /Subject/ }), 'Maths')
    await userEvent.click(within(d).getByRole('button', { name: '20' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Create' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        expect.stringMatching(/\/assessments$/),
        { title: 'Weekly quiz', description: null, subject_id: 5, class_id: null, total_marks: 20, scheduled_date: null },
        json,
      ),
    )
  })

  it('assign: class filter, pre-selected assignments, legacy body', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await userEvent.click(within(await row()).getByRole('button', { name: 'Assign students to Unit Test 1' }))
    const d = await screen.findByRole('dialog')
    expect(await within(d).findByText('Already assigned')).toBeTruthy()
    expect(within(d).queryByText('Ravi')).toBeNull() // other class
    await userEvent.click(within(d).getByRole('button', { name: 'Assign 1' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/assign$/), { assignments: [{ student_id: 3, scheduled_date: '2026-10-10' }] }, auth))
  })

  it('results: marks over the total are blocked; saving asks first', async () => {
    signIn('teacher')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await userEvent.click(within(await row()).getByRole('button', { name: 'Results for Unit Test 1' }))
    const d = await screen.findByRole('dialog')
    const marks = await within(d).findByRole('spinbutton', { name: 'Marks for Asha' })
    await userEvent.type(marks, '60')
    expect(within(d).getByText("Can't be more than 50.")).toBeTruthy()
    await userEvent.click(within(d).getByRole('button', { name: /^Save/ }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await userEvent.clear(marks)
    await userEvent.type(marks, '42')
    await userEvent.click(within(d).getByRole('button', { name: 'Save (1 result)' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText(/told their result is out/)).toBeTruthy()
    await userEvent.click(within(confirm).getByRole('button', { name: 'Yes, save' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/results$/), { results: [{ student_id: 3, marks_obtained: 42, total_marks: 50, teacher_notes: undefined }] }, json),
    )
  })
})

describe('AssessmentsPage — confirmations', () => {
  it('approving an assessment asks first', async () => {
    signIn('coaching_admin')
    mockGets()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: { success: true, data: { ...asm, is_admin_approved: true } } })
    renderPage()
    await userEvent.click(within(await row()).getByRole('button', { name: 'Approve' }))
    const c = await screen.findByRole('alertdialog')
    expect(patch).not.toHaveBeenCalled()
    await userEvent.click(within(c).getByRole('button', { name: 'Yes, approve' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/approval$/), { approved: true }, json))
  })

  it('auto-generate toggle asks first', async () => {
    signIn('coaching_admin')
    mockGets()
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true, data: { enabled: true } } })
    renderPage()
    await row()
    await userEvent.click(screen.getByRole('switch'))
    const c = await screen.findByRole('alertdialog')
    await userEvent.click(within(c).getByRole('button', { name: 'No' }))
    expect(put).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('switch'))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, turn on' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith(expect.stringMatching(/\/tenant\/auto-assessment$/), { enabled: true }, json))
  })

  it('removing a file asks first (admin only)', async () => {
    signIn('coaching_admin')
    mockGets()
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    renderPage()
    await userEvent.click(within(await row()).getByRole('button', { name: 'Files for Unit Test 1' }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(await within(d).findByRole('button', { name: 'Remove paper.pdf' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, remove' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/files\/60$/), auth))
  })

  it('removing a question from the paper asks first', async () => {
    signIn('teacher')
    mockGets()
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    renderPage()
    await userEvent.click(within(await row()).getByRole('button', { name: 'Question paper for Unit Test 1' }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(await within(d).findByRole('button', { name: 'Remove question 1' }))
    const c = await screen.findByRole('alertdialog')
    expect(within(c).getByText(/stays in the question bank/)).toBeTruthy()
    await userEvent.click(within(c).getByRole('button', { name: 'Yes, remove' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/assessments\/7\/question-paper\/questions\/91$/), json))
  })
})

describe('AssessmentsPage — tracking', () => {
  const progress = (stage: string, extra = {}) => ({ total: 2, upcoming: 0, today: 0, awaiting_results: 0, result_out: 0, absent: 0, cancelled: 0, next_date: null, oldest_pending_date: null, stage, ...extra })
  const list = [
    { ...asm, progress: progress('needs_results', { awaiting_results: 2, oldest_pending_date: '2026-10-14' }) },
    { ...asm, id: 8, title: 'Weekly Quiz', progress: progress('upcoming', { upcoming: 2, next_date: '2026-10-30' }) },
    { ...asm, id: 9, title: 'Old Test', progress: progress('done', { result_out: 2 }) },
  ]
  const trackDetail = {
    ...detail,
    assignments: [
      { id: 1, student_id: 3, scheduled_date: '2026-10-14', status: 'upcoming', stage: 'awaiting_results', student: { id: 3, name: 'Asha' } },
      { id: 2, student_id: 4, scheduled_date: '2026-10-14', status: 'upcoming', stage: 'awaiting_results', student: { id: 4, name: 'Ravi' } },
    ],
  }
  function mockTracking() {
    return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
      const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } })
      if (url.endsWith('/assessments')) return ok(list)
      if (url.endsWith('/assessments/7')) return ok(trackDetail)
      if (url.endsWith('/subjects/4')) return Promise.resolve({ data: { status: true, data: [{ id: 5, subject: 'Maths' }] } })
      if (url.endsWith('/classes/4')) return ok([{ id: 1, name: 'Class 9' }])
      if (url.endsWith('/tenant/auto-assessment')) return ok({ enabled: false })
      return ok([])
    })
  }

  it('opens on "Needs results" with counts; other tabs filter the list', async () => {
    signIn('teacher')
    mockTracking()
    renderPage()
    const tab = await screen.findByRole('tab', { name: 'Needs results (1)' })
    expect(tab.getAttribute('aria-selected')).toBe('true')
    expect(await screen.findByText('Unit Test 1')).toBeTruthy()
    expect(screen.queryByText('Weekly Quiz')).toBeNull()
    expect(screen.getByText('Pending since 14/10/2026')).toBeTruthy()
    await userEvent.click(screen.getByRole('tab', { name: 'Upcoming (1)' }))
    expect(await screen.findByText('Weekly Quiz')).toBeTruthy()
    expect(screen.queryByText('Unit Test 1')).toBeNull()
    await userEvent.click(screen.getByRole('tab', { name: 'All (3)' }))
    expect(await screen.findByText('Old Test')).toBeTruthy()
  })

  it('Enter results: marks for one, Absent for the other, sent together', async () => {
    signIn('teacher')
    mockTracking()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Enter results/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(await within(d).findByRole('spinbutton', { name: 'Marks for Asha' }), '40')
    await userEvent.click(within(d).getByRole('switch', { name: 'Ravi was absent' }))
    expect((within(d).getByRole('spinbutton', { name: 'Marks for Ravi' }) as HTMLInputElement).disabled).toBe(true)
    await userEvent.click(within(d).getByRole('button', { name: 'Save (1 result · 1 absent)' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, save' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ results: [{ student_id: 3, marks_obtained: 40, total_marks: 50, teacher_notes: undefined }, { student_id: 4, absent: true }] })
  })

  it('bulk: reschedule the selected students', async () => {
    signIn('teacher')
    mockTracking()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, message: 'Rescheduled 1 student.', data: { progress: progress('upcoming') } } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Enter results/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(await within(d).findByRole('checkbox', { name: 'Select Ravi' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Reschedule' }))
    const confirm = await screen.findByRole('alertdialog')
    const date = within(confirm).getByLabelText('New date')
    await userEvent.clear(date)
    await userEvent.type(date, '2030-01-15')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Yes, reschedule' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toMatch(/\/assessments\/7\/assignments\/bulk$/)
    expect(post.mock.calls[0][1]).toEqual({ student_ids: [4], action: 'reschedule', scheduled_date: '2030-01-15' })
  })

  it('a notification link (?assessment=7&results=1) opens the results straight away', async () => {
    signIn('teacher')
    mockTracking()
    Element.prototype.scrollIntoView = vi.fn() // jsdom has no scrolling; the page scrolls to the focused row
    render(
      <MemoryRouter initialEntries={['/assessments?assessment=7&results=1']}>
        <AssessmentsPage />
      </MemoryRouter>,
    )
    const d = await screen.findByRole('dialog')
    expect(within(d).getByText('Results — Unit Test 1')).toBeTruthy()
    expect(await within(d).findByRole('spinbutton', { name: 'Marks for Asha' })).toBeTruthy()
  })
})

